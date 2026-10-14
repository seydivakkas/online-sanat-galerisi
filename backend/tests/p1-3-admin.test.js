process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'P1_3_ADMIN_TEST_nonproduction_secret_random_2026_only';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { sequelize, User, Artist, Category, Artwork, Order,
  SupportTicket, SupportMessage } = require('../models');
const app = require('../server');

let server, base, users, artistId, categoryId, artworkId, ticketId;
function token(role) {
  return jwt.sign({ id: users[role].user_id, role: users[role].role },
    process.env.JWT_SECRET, { expiresIn: '1h' });
}
async function api(method, route, actor, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (actor) headers.Authorization = 'Bearer ' + token(actor);
  const r = await fetch(base + route, { method, headers,
    body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, data: await r.json() };
}
before(async () => {
  await sequelize.sync({ force: true });
  users = {};
  const password_hash = await bcrypt.hash('p13-demo-pass', 8);
  for (const [actor, role] of [
    ['admin', 'admin'], ['manager', 'gallery_manager'],
    ['customer', 'customer'], ['other', 'customer']
  ]) {
    users[actor] = await User.create({
      username: 'p13_' + actor, email: 'p13_' + actor + '@example.invalid',
      password_hash, role, is_active: true
    });
  }
  server = await new Promise(resolve => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  base = 'http://127.0.0.1:' + server.address().port;
});
after(async () => {
  if (server) await new Promise((resolve, reject) => server.close(e => e ? reject(e) : resolve()));
  await sequelize.close();
});

test('anonymous and customers cannot manage artists or categories', async () => {
  const r = await api('POST', '/api/admin/artists', 'customer', { name: 'X Artist' });
  assert.equal(r.status, 403);
  assert.equal((await api('GET', '/api/admin/artists', null)).status, 401);
  assert.equal((await api('POST', '/api/admin/categories', 'customer', { name: 'X Cat' })).status, 403);
});

test('manager creates and updates an artist and category', async () => {
  const artist = await api('POST', '/api/admin/artists', 'manager', { name: 'Contemporary Artist', bio: 'Art' });
  assert.equal(artist.status, 201, JSON.stringify(artist.data));
  artistId = artist.data.data.artist_id;
  const category = await api('POST', '/api/admin/categories', 'manager', {
    name: 'Original Works', description: 'Category description'
  });
  assert.equal(category.status, 201, JSON.stringify(category.data));
  categoryId = category.data.data.category_id;
  const update = await api('PUT', '/api/admin/artists/' + artistId, 'manager', {
    name: 'Contemporary Artist Updated'
  });
  assert.equal(update.status, 200);
  assert.equal((await Artist.findByPk(artistId)).name, 'Contemporary Artist Updated');
  const editCategory = await api('PUT', '/api/admin/categories/' + categoryId,
    'manager', { description: 'Edited' });
  assert.equal(editCategory.status, 200);
});

test('artwork creation rejects invalid references and incorrect price', async () => {
  const invalid = await api('POST', '/api/artworks', 'manager', {
    title: 'Paper', artist_id: artistId, category_id: categoryId,
    price: '-1', stock_quantity: 1
  });
  assert.equal(invalid.status, 400);
  const missing = await api('POST', '/api/artworks', 'manager', {
    title: 'Paper', artist_id: 999999, category_id: categoryId,
    price: '15.00', stock_quantity: 1
  });
  assert.equal(missing.status, 400);
});

test('manager can create a valid artwork, while customer cannot', async () => {
  const customer = await api('POST', '/api/artworks', 'customer', {
    title: 'Paper', artist_id: artistId, category_id: categoryId,
    price: '15.00', stock_quantity: 2
  });
  assert.equal(customer.status, 403);
  const r = await api('POST', '/api/artworks', 'manager', {
    title: 'Paper', artist_id: artistId, category_id: categoryId,
    price: '15.00', stock_quantity: 2
  });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  artworkId = r.data.data.artwork_id;
});

test('referenced categories cannot be deleted', async () => {
  const r = await api('DELETE', '/api/admin/categories/' + categoryId, 'manager');
  assert.equal(r.status, 409);
  assert.ok(await Category.findByPk(categoryId));
});

test('artwork deletion preserves record and buyer history', async () => {
  const r = await api('DELETE', '/api/admin/artworks/' + artworkId, 'manager');
  assert.equal(r.status, 200);
  assert.equal((await Artwork.findByPk(artworkId)).is_available, false);
});

test('artist retirement retains artworks, can be reactivated', async () => {
  const retired = await api('DELETE', '/api/admin/artists/' + artistId, 'manager');
  assert.equal(retired.status, 200);
  assert.equal((await Artist.findByPk(artistId)).is_active, false);
  assert.ok(await Artwork.findByPk(artworkId));
  const revived = await api('PUT', '/api/admin/artists/' + artistId, 'manager', { is_active: true });
  assert.equal(revived.status, 200);
});

test('customer creates ticket and sees own ticket only', async () => {
  const first = await api('POST', '/api/support/tickets', 'customer', {
    subject: 'Workshop question', message: 'I need details about my event.'
  });
  assert.equal(first.status, 201, JSON.stringify(first.data));
  ticketId = first.data.data.ticket.ticket_id;
  assert.equal(await SupportMessage.count({ where: { ticket_id: ticketId } }), 1);
  const own = await api('GET', '/api/support/tickets/' + ticketId, 'customer');
  assert.equal(own.status, 200);
  const someoneElse = await api('GET', '/api/support/tickets/' + ticketId, 'other');
  assert.equal(someoneElse.status, 404);
});

test('customer cannot list staff queue or change ticket status', async () => {
  assert.equal((await api('GET', '/api/support/admin/tickets', 'customer')).status, 403);
  const changed = await api('PATCH', '/api/support/admin/tickets/' + ticketId + '/status',
    'customer', { status: 'closed' });
  assert.equal(changed.status, 403);
});

test('manager can read customer ticket, reply and resolve it', async () => {
  const queue = await api('GET', '/api/support/admin/tickets', 'manager');
  assert.equal(queue.status, 200);
  assert.ok(queue.data.data.some(t => t.ticket_id === ticketId));
  const detail = await api('GET', '/api/support/tickets/' + ticketId, 'manager');
  assert.equal(detail.status, 200);
  const reply = await api('POST', '/api/support/tickets/' + ticketId + '/messages',
    'manager', { message_text: 'Your workshop is confirmed in the event detail.' });
  assert.equal(reply.status, 201);
  assert.equal((await SupportTicket.findByPk(ticketId)).status, 'in_progress');
  const resolved = await api('PATCH', '/api/support/admin/tickets/' + ticketId + '/status',
    'manager', { status: 'resolved' });
  assert.equal(resolved.status, 200);
  assert.equal((await SupportTicket.findByPk(ticketId)).status, 'resolved');
});

test('closed ticket blocks further replies but can be reopened by staff', async () => {
  const closed = await api('PATCH', '/api/support/admin/tickets/' + ticketId + '/status',
    'admin', { status: 'closed' });
  assert.equal(closed.status, 200);
  assert.equal((await api('POST', '/api/support/tickets/' + ticketId + '/messages',
    'customer', { message_text: 'Please reopen this.' })).status, 409);
  assert.equal((await api('PATCH', '/api/support/admin/tickets/' + ticketId + '/status',
    'manager', { status: 'open' })).status, 409);
  assert.equal((await api('PATCH', '/api/support/admin/tickets/' + ticketId + '/status',
    'manager', { status: 'in_progress' })).status, 200);
});

test('admin user removal is reversible soft-deactivation', async () => {
  const resp = await api('DELETE', '/api/admin/users/' + users.other.user_id, 'admin');
  assert.equal(resp.status, 200);
  assert.equal((await User.findByPk(users.other.user_id)).is_active, false);
  const blocked = await api('GET', '/api/support/tickets', 'other');
  assert.equal(blocked.status, 401);
});

test('manager cannot remove user; self-delete forbidden', async () => {
  const id = users.customer.user_id;
  assert.equal((await api('DELETE', '/api/admin/users/' + id, 'manager')).status, 403);
  assert.equal((await api('DELETE', '/api/admin/users/' + users.admin.user_id, 'admin')).status, 400);
});

test('used coupon cannot be deleted even without an order record', async () => {
  const created = await api('POST', '/api/admin/coupons', 'admin', {
    code: 'P13USED', discount_amount: 5, max_uses: 10
  });
  assert.equal(created.status, 201);
  const id = created.data.data.coupon_id;
  const { Coupon } = require('../models');
  await Coupon.update({ used_count: 1 }, { where: { coupon_id: id } });
  assert.equal((await api('DELETE', '/api/admin/coupons/' + id, 'admin')).status, 409);
});
