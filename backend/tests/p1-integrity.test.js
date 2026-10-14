process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'P1_RESERVATION_TEST_only_random_nonproduction_secret';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { sequelize, User, Artist, Category, Artwork, Event,
  Order, OrderItem, Reservation, OrderStatusAudit } = require('../models');
const { expirePendingOrders } = require('../services/orderHolds');
const app = require('../server');

let server, base, users, paid, free, art, artist, category;
const date = new Date(Date.now() + 7 * 24 * 3600000).toISOString().slice(0, 10);
const time = '16:00';
const referenceDate = new Date().toISOString().slice(0, 10);
const jwtFor = who => jwt.sign({ id: users[who].user_id, role: users[who].role },
  process.env.JWT_SECRET, { expiresIn: '1h' });
const proof = (ref, amount = '60.00') => ({
  payment_reference: ref, verified_amount: amount,
  evidence_date: referenceDate, evidence_source: 'bank_statement',
  evidence_note: 'Gerçek banka hareketi ile referans, tutar ve alıcı kaydı eşleştirildi'
});

async function api(method, route, who, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (who) headers.Authorization = 'Bearer ' + jwtFor(who);
  const res = await fetch(base + route, { method, headers,
    body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: res.status, body: await res.json() };
}
const eventItem = (event = paid, count = 1, d = date, t = time) => ({
  item_type: 'event', item_id: event.event_id, quantity: count,
  reservation_date: d, reservation_time: t
});
const artItem = (artwork = art, count = 1) => ({
  item_type: 'artwork', item_id: artwork.artwork_id, quantity: count
});
const checkout = (who, items) => api('POST', '/api/orders', who,
  { payment_method: 'bank_transfer', items });
const countEvent = async event => Number((await Event.findByPk(event.event_id)).current_registrations);
const countStock = async artwork => Number((await Artwork.findByPk(artwork.artwork_id)).stock_quantity);

before(async () => {
  await sequelize.sync({ force: true }); // ONLY test database :memory:
  users = {};
  const hash = await bcrypt.hash('p1-only-test-password', 8);
  for (const [name, role] of [['admin', 'admin'], ['customer', 'customer'],
    ['other', 'customer'], ['manager', 'gallery_manager']]) {
    users[name] = await User.create({
      username: 'p1_' + name, email: 'p1_' + name + '@example.invalid',
      role, password_hash: hash
    });
  }
  artist = await Artist.create({ name: 'P1 Artist' });
  category = await Category.create({ name: 'P1 Category' });
  art = await Artwork.create({ title: 'P1 Limited Painting', artist_id: artist.artist_id,
    category_id: category.category_id, price: '60.00', stock_quantity: 3, is_available: true });
  paid = await Event.create({ title: 'P1 Paid Workshop', event_date: date,
    event_time: time, capacity: 5, current_registrations: 0,
    is_active: true, price: '60.00' });
  free = await Event.create({ title: 'P1 Free Workshop', event_date: date,
    event_time: time, capacity: 2, current_registrations: 0,
    is_active: true, price: '0.00' });
  server = await new Promise(resolve => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  base = 'http://127.0.0.1:' + server.address().port;
});
after(async () => {
  if (server) await new Promise((resolve, reject) =>
    server.close(e => e ? reject(e) : resolve()));
  await sequelize.close();
});

test('paid direct reservation cannot bypass checkout', async () => {
  const start = await countEvent(paid);
  const r = await api('POST', '/api/reservations', 'customer', {
    event_id: paid.event_id, participant_count: 1,
    reservation_date: date, reservation_time: time
  });
  assert.equal(r.status, 409);
  assert.equal(await countEvent(paid), start);
});

test('free direct reservation is confirmed with canonical date/time and counted', async () => {
  const r = await api('POST', '/api/reservations', 'customer', {
    event_id: free.event_id, participant_count: 1,
    reservation_date: date, reservation_time: time
  });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.data.reservation.status, 'confirmed');
  assert.equal(r.body.data.reservation.reservation_date, date);
  assert.equal(r.body.data.reservation.reservation_time, time);
  assert.equal(await countEvent(free), 1);
});

test('free booking prevents duplicate and oversubscription', async () => {
  const dup = await api('POST', '/api/reservations', 'customer', {
    event_id: free.event_id, participant_count: 1,
    reservation_date: date, reservation_time: time
  });
  assert.equal(dup.status, 409);
  const full = await api('POST', '/api/reservations', 'other', {
    event_id: free.event_id, participant_count: 2,
    reservation_date: date, reservation_time: time
  });
  assert.equal(full.status, 409);
  assert.equal(await countEvent(free), 1);
});

test('invalid or tampered event date/time never books a seat', async () => {
  const initial = await countEvent(paid);
  const r = await checkout('customer', [eventItem(paid, 1, '2099-01-01', time)]);
  assert.equal(r.status, 409);
  assert.equal(await countEvent(paid), initial);
});

test('paid checkout holds one seat and links pending reservation to order', async () => {
  const r = await checkout('customer', [eventItem()]);
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const order = r.body.data.order;
  assert.equal(order.status, 'pending');
  assert.ok(Date.parse(order.expires_at) > Date.now());
  assert.equal(order.reservations.length, 1);
  const booking = order.reservations[0];
  assert.equal(booking.order_id, order.order_id);
  assert.equal(booking.reservation_date, date);
  assert.equal(booking.reservation_time, time);
  assert.equal(booking.status, 'pending');
  assert.equal(await countEvent(paid), 1);
});

test('same user cannot book a second pending seat and different user capacity is enforced', async () => {
  const dup = await checkout('customer', [eventItem()]);
  assert.equal(dup.status, 409);
  const start = await countEvent(paid);
  const tooMany = await checkout('other', [eventItem(paid, 5)]);
  assert.equal(tooMany.status, 409);
  assert.equal(await countEvent(paid), start);
});

test('cancel pending event order restores seat exactly once', async () => {
  const own = await Order.findOne({ where: { user_id: users.customer.user_id, status: 'pending' },
    include: [{ model: Reservation, as: 'reservations' }] });
  const first = await api('POST', '/api/orders/' + own.order_id + '/cancel', 'customer');
  assert.equal(first.status, 200);
  const again = await api('POST', '/api/orders/' + own.order_id + '/cancel', 'customer');
  assert.equal(again.status, 200);
  assert.equal(again.body.data.already_closed, true);
  assert.equal(await countEvent(paid), 0);
  const booking = await Reservation.findByPk(own.reservations[0].reservation_id);
  assert.equal(booking.status, 'cancelled');
  const audit = await OrderStatusAudit.findAll({ where: { order_id: own.order_id } });
  assert.equal(audit.length, 1);
});

test('pending artwork hold expires and restores stock through sweeper', async () => {
  const beforeStock = await countStock(art);
  const r = await checkout('other', [artItem()]);
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const id = r.body.data.order.order_id;
  assert.equal(await countStock(art), beforeStock - 1);
  await Order.update({ expires_at: new Date(Date.now() - 1000) }, {
    where: { order_id: id }
  });
  assert.equal(await expirePendingOrders(), 1);
  assert.equal(await expirePendingOrders(), 0);
  assert.equal(await countStock(art), beforeStock);
  const order = await Order.findByPk(id);
  assert.equal(order.status, 'cancelled');
});

test('admin bank verification confirms the linked event booking', async () => {
  const create = await checkout('other', [eventItem()]);
  assert.equal(create.status, 201, JSON.stringify(create.body));
  const id = create.body.data.order.order_id;
  const result = await api('POST', '/api/admin/orders/' + id + '/verify-bank-transfer',
    'admin', proof('P1-PAID-EVENT-0001'));
  assert.equal(result.status, 200, JSON.stringify(result.body));
  const booking = await Reservation.findOne({ where: { order_id: id } });
  assert.equal(booking.status, 'confirmed');
  assert.equal(booking.reservation_date, date);
  assert.equal(await countEvent(paid), 1);
});

test('bank refund requires administrator and an actual new outgoing reference', async () => {
  const own = await Order.findOne({ where: { user_id: users.other.user_id, status: 'paid' },
    include: [{ model: Reservation, as: 'reservations' }] });
  const endpoint = '/api/admin/orders/' + own.order_id + '/verify-bank-refund';
  assert.equal((await api('POST', endpoint, 'other',
    proof('P1-REFUND-0001'))).status, 403);
  assert.equal((await api('POST', endpoint, 'manager',
    proof('P1-REFUND-0001'))).status, 403);
  const refund = await api('POST', endpoint, 'admin', proof('P1-REFUND-0001'));
  assert.equal(refund.status, 200, JSON.stringify(refund.body));
  assert.equal(await countEvent(paid), 0);
  const booking = await Reservation.findByPk(own.reservations[0].reservation_id);
  assert.equal(booking.status, 'cancelled');
  const audit = await OrderStatusAudit.findAll({ where: { order_id: own.order_id } });
  assert.deepEqual(audit.map(a => a.action),
    ['manual_bank_attestation', 'manual_bank_refund']);
  assert.equal((await api('POST', endpoint, 'admin',
    proof('P1-REFUND-0001'))).status, 409);
});

test('paid event booking cannot be directly cancelled via reservation endpoint', async () => {
  const created = await checkout('customer', [eventItem()]);
  const id = created.body.data.order.order_id;
  const reservation = await Reservation.findOne({ where: { order_id: id } });
  const cancel = await api('DELETE', '/api/reservations/' + reservation.reservation_id,
    'customer');
  assert.equal(cancel.status, 409);
  await api('POST', '/api/orders/' + id + '/cancel', 'customer');
});

test('admin cannot shrink event capacity under active held places or change reserved slot', async () => {
  const created = await checkout('customer', [eventItem()]);
  assert.equal(created.status, 201);
  const shrink = await api('PUT', '/api/admin/events/' + paid.event_id, 'admin',
    { capacity: 0 });
  assert.equal(shrink.status, 400);
  const shift = await api('PUT', '/api/admin/events/' + paid.event_id, 'admin',
    { event_time: '18:00' });
  assert.equal(shift.status, 409);
  const id = created.body.data.order.order_id;
  await api('POST', '/api/orders/' + id + '/cancel', 'customer');
});

test('pending paid orders are never shipped and duplicate line items are rejected', async () => {
  const created = await checkout('other', [artItem()]);
  assert.equal(created.status, 201);
  const id = created.body.data.order.order_id;
  const ship = await api('PATCH', '/api/admin/orders/' + id + '/status',
    'admin', { status: 'shipped' });
  assert.equal(ship.status, 409);
  const duplicate = await checkout('other', [artItem(), artItem()]);
  assert.equal(duplicate.status, 400);
  await api('POST', '/api/orders/' + id + '/cancel', 'other');
});

test('expired pending order cannot be confirmed as paid', async () => {
  const created = await checkout('customer', [artItem()]);
  assert.equal(created.status, 201);
  const id = created.body.data.order.order_id;
  await Order.update({ expires_at: new Date(Date.now() - 2000) }, {
    where: { order_id: id }
  });
  const r = await api('POST', '/api/admin/orders/' + id + '/verify-bank-transfer',
    'admin', proof('P1-EXPIRED-0001'));
  assert.equal(r.status, 409);
  const order = await Order.findByPk(id);
  assert.equal(order.status, 'cancelled');
});
