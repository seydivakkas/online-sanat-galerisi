process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'P0_2_PAYMENT_TEST_only_secure_random_demo_token_value';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { sequelize, User, Order, OrderStatusAudit } = require('../models');
const app = require('../server');

let server;
let url;
let users;

const token = who => jwt.sign({ id: users[who].user_id, role: users[who].role },
  process.env.JWT_SECRET, { expiresIn: '1h' });

async function api(method, route, who, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (who) headers.Authorization = 'Bearer ' + token(who);
  const res = await fetch(url + route, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body)
  });
  return { status: res.status, data: await res.json() };
}

async function newOrder(method = 'bank_transfer', amount = '45.50') {
  return Order.create({ user_id: users.customer.user_id, total_amount: amount,
    payment_method: method, status: 'pending' });
}

const date = new Date().toISOString().slice(0, 10);
const evidence = (ref, amount = '45.50') => ({
  payment_reference: ref,
  verified_amount: amount,
  evidence_date: date,
  evidence_source: 'bank_statement',
  evidence_note: 'Banka hesap ekstresi üzerinden referans, tutar ve alıcı kontrol edildi'
});

before(async () => {
  await sequelize.sync({ force: true }); // only in-memory test DB
  users = {};
  const password_hash = await bcrypt.hash('testOnlyPassword!', 8);
  for (const [who, role] of [['admin', 'admin'], ['manager', 'gallery_manager'],
    ['customer', 'customer']]) {
    users[who] = await User.create({
      username: 'p02_' + who, email: 'p02_' + who + '@example.invalid',
      role, password_hash
    });
  }
  server = await new Promise(resolve => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  url = 'http://127.0.0.1:' + server.address().port;
});
after(async () => {
  if (server) await new Promise((resolve, reject) =>
    server.close(e => e ? reject(e) : resolve()));
  await sequelize.close();
});

test('legacy client confirm endpoint returns 410 without changing status', async () => {
  const order = await newOrder();
  const r = await api('POST', '/api/orders/' + order.order_id + '/confirm', 'customer');
  assert.equal(r.status, 410);
  await order.reload();
  assert.equal(order.status, 'pending');
});

test('manual bank attestation must be admin-only', async () => {
  const order = await newOrder();
  const endpoint = '/api/admin/orders/' + order.order_id + '/verify-bank-transfer';
  assert.equal((await api('POST', endpoint, 'customer', evidence('CUST-REF-0001'))).status, 403);
  assert.equal((await api('POST', endpoint, 'manager', evidence('MGR-REF-0001'))).status, 403);
  assert.equal((await OrderStatusAudit.count({ where: { order_id: order.order_id } })), 0);
});

test('evidence must match bank amount and contain required metadata', async () => {
  const order = await newOrder();
  const endpoint = '/api/admin/orders/' + order.order_id + '/verify-bank-transfer';
  assert.equal((await api('POST', endpoint, 'admin',
    { ...evidence('BAD-REF-0001'), payment_reference: '!!' })).status, 400);
  assert.equal((await api('POST', endpoint, 'admin',
    evidence('BAD-REF-0002', '42.99'))).status, 409);
  await order.reload();
  assert.equal(order.status, 'pending');
  assert.equal(await OrderStatusAudit.count({ where: { order_id: order.order_id } }), 0);
});

test('one manual bank attestation atomically updates payment and creates audit history', async () => {
  const order = await newOrder();
  const endpoint = '/api/admin/orders/' + order.order_id + '/verify-bank-transfer';
  const first = await api('POST', endpoint, 'admin', evidence('BANK-PAY-0001'));
  assert.equal(first.status, 200, JSON.stringify(first.data));
  await order.reload();
  assert.equal(order.status, 'paid');
  const audit = await OrderStatusAudit.findOne({ where: { order_id: order.order_id } });
  assert.equal(audit.payment_reference, 'BANK-PAY-0001');
  assert.equal(audit.actor_id, users.admin.user_id);
  assert.equal(audit.to_status, 'paid');
  assert.equal((await api('POST', endpoint, 'admin', evidence('BANK-PAY-0001'))).status, 409);
  assert.equal(await OrderStatusAudit.count({ where: { order_id: order.order_id } }), 1);
});

test('a transfer reference cannot be reused on a different order', async () => {
  const order = await newOrder();
  const endpoint = '/api/admin/orders/' + order.order_id + '/verify-bank-transfer';
  const attempt = await api('POST', endpoint, 'admin', evidence('BANK-PAY-0001'));
  assert.equal(attempt.status, 409);
  await order.reload();
  assert.equal(order.status, 'pending');
});

test('unverified or incorrectly sequenced status transitions are denied', async () => {
  const order = await newOrder();
  const endpoint = '/api/admin/orders/' + order.order_id + '/status';
  for (const status of ['paid', 'delivered', 'cancelled', 'pending', 'shipped']) {
    assert.equal((await api('PATCH', endpoint, 'admin', { status })).status, 409);
  }
  await order.reload();
  assert.equal(order.status, 'pending');
  assert.equal(await OrderStatusAudit.count({ where: { order_id: order.order_id } }), 0);
});

test('only paid->shipped->delivered is allowed, with auditable actor', async () => {
  const order = await newOrder();
  const id = order.order_id;
  assert.equal((await api('POST', '/api/admin/orders/' + id + '/verify-bank-transfer',
    'admin', evidence('BANK-PAY-0002'))).status, 200);
  const endpoint = '/api/admin/orders/' + id + '/status';
  assert.equal((await api('PATCH', endpoint, 'manager', { status: 'shipped' })).status, 200);
  assert.equal((await api('PATCH', endpoint, 'manager', { status: 'shipped' })).status, 409);
  assert.equal((await api('PATCH', endpoint, 'manager', { status: 'delivered' })).status, 200);
  assert.equal((await api('PATCH', endpoint, 'manager', { status: 'paid' })).status, 409);
  const history = await api('GET', '/api/admin/orders/' + id + '/audit', 'admin');
  assert.equal(history.status, 200);
  assert.deepEqual(history.data.data.map(r => r.to_status), ['paid', 'shipped', 'delivered']);
  assert.equal(history.data.data[1].actor_id, users.manager.user_id);
  await order.reload();
  assert.equal(order.status, 'delivered');
});

test('client cannot read admin audit history', async () => {
  const order = await newOrder();
  const r = await api('GET', '/api/admin/orders/' + order.order_id + '/audit', 'customer');
  assert.equal(r.status, 403);
});

test('unsupported card and PayPal checkouts are rejected before DB writes', async () => {
  const beforeCount = await Order.count();
  for (const payment_method of ['credit_card', 'paypal']) {
    const r = await api('POST', '/api/orders', 'customer', {
      payment_method, items: [{ item_type: 'artwork', item_id: 1, quantity: 1 }]
    });
    assert.equal(r.status, 409);
  }
  assert.equal(await Order.count(), beforeCount);
});

test('unsafe event ticket checkout is blocked before granting attendance', async () => {
  const beforeCount = await Order.count();
  const r = await api('POST', '/api/orders', 'customer', {
    payment_method: 'bank_transfer',
    items: [{ item_type: 'event', item_id: 1, quantity: 1 }]
  });
  assert.equal(r.status, 409);
  assert.equal(await Order.count(), beforeCount);
});

test('historical paid orders without audit are blocked from fulfillment', async () => {
  const legacy = await Order.create({
    user_id: users.customer.user_id, total_amount: '45.50',
    payment_method: 'credit_card', status: 'paid'
  });
  const r = await api('PATCH', '/api/admin/orders/' + legacy.order_id + '/status',
    'admin', { status: 'shipped' });
  assert.equal(r.status, 409);
  await legacy.reload();
  assert.equal(legacy.status, 'paid');
});

