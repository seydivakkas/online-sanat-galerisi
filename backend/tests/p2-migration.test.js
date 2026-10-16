// P2 migrations are checked on an isolated disposable SQLite FILE (not
// :memory:) so backup/VACUUM INTO can be verified without touching user data.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'gallery-p2-'));
process.env.NODE_ENV = 'migration_test';
process.env.ART_GALLERY_SQLITE_PATH = path.join(scratch, 'legacy.sqlite');
process.env.JWT_SECRET = 'P2_ONLY_TEST_SECRET_which_must_never_be_used_in_production';

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { DataTypes } = require('sequelize');
const { sequelize, User, Artist, Category, Artwork, Event,
  Order, Reservation, OrderStatusAudit } = require('../models');
const { inspectSchema, assertSchemaReady, applyMigrations } = require('../migrations/runner');

after(async () => {
  await sequelize.close();
  fs.rmSync(scratch, { recursive: true, force: true });
});

test('schema inspection and additive P2 migration preserve legacy rows', async () => {
  const qi = sequelize.getQueryInterface();
  await sequelize.sync({ force: true });
  // Simulate a previously deployed P0/P1 schema.
  await qi.removeColumn('orders', 'expires_at');
  await qi.removeColumn('reservations', 'order_id');
  await qi.changeColumn('order_status_audits', 'actor_id', {
    type: DataTypes.INTEGER, allowNull: false,
    references: { model: 'users', key: 'user_id' }
  });
  const legacy = await inspectSchema();
  assert.equal(legacy.missingOrderExpiry, true);
  assert.equal(legacy.missingReservationLink, true);
  assert.equal(legacy.auditActorNonNullable, true);
  await assert.rejects(assertSchemaReady(), /not P2-ready/);

  const user = await User.create({
    username: 'legacy_user', email: 'legacy@example.invalid',
    password_hash: 'test_only_hash', role: 'customer', is_active: true
  });
  const artist = await Artist.create({ name: 'Legacy Artist' });
  const category = await Category.create({ name: 'Legacy Category' });
  await Artwork.create({ title: 'Legacy Art', artist_id: artist.artist_id,
    category_id: category.category_id, price: '30', stock_quantity: 2 });
  const event = await Event.create({ title: 'Legacy Event', event_date: '2099-01-01',
    event_time: '10:00', price: 20, capacity: 8, current_registrations: 1 });
  const order = await Order.create({ user_id: user.user_id,
    total_amount: '20.00', payment_method: 'bank_transfer', status: 'paid' });
  const reservation = await Reservation.create({
    user_id: user.user_id, event_id: event.event_id,
    participant_count: 1, reservation_date: '2099-01-01', reservation_time: '10:00',
    status: 'confirmed'
  });
  const audit = await OrderStatusAudit.create({
    order_id: order.order_id, actor_id: user.user_id,
    action: 'manual_bank_attestation', from_status: 'pending',
    to_status: 'paid', payment_reference: 'LEGACY-PAY-0001'
  });
  const beforeAuditCount = await OrderStatusAudit.count();
  const applied = await applyMigrations();
  assert.ok(applied.backupPath && fs.existsSync(applied.backupPath),
    'SQLite backup must exist before migration');
  assert.ok(applied.changes.includes('orders.expires_at'));
  assert.ok(applied.changes.includes('reservations.order_id'));
  await assertSchemaReady();
  assert.equal(await User.count(), 1);
  assert.equal(await Artwork.count(), 1);
  assert.equal(await Order.count(), 1);
  assert.equal(await Reservation.count(), 1);
  assert.equal(await OrderStatusAudit.count(), beforeAuditCount);
  assert.equal((await OrderStatusAudit.findByPk(audit.audit_id)).payment_reference, 'LEGACY-PAY-0001');
  assert.equal((await Order.findByPk(order.order_id)).expires_at, null);
  assert.equal((await Reservation.findByPk(reservation.reservation_id)).order_id, null);
});

test('migration is repeatable without deleting records or recreating columns', async () => {
  const applied = await applyMigrations();
  assert.deepEqual(applied.changes, []);
  assert.equal(await User.count(), 1);
  const structure = await inspectSchema();
  assert.equal(structure.auditActorNonNullable, false);
});

test('system expiration actor is nullable after migration', async () => {
  const order = await Order.findOne();
  const entry = await OrderStatusAudit.create({
    order_id: order.order_id, actor_id: null,
    action: 'hold_expired', from_status: 'pending',
    to_status: 'cancelled'
  });
  assert.equal(entry.actor_id, null);
});
