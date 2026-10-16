'use strict';

// P3 synthetic acceptance tests: no real customer file is ever opened.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'P3_ACCEPTANCE_SYNTHETIC_NO_CUSTOMER_DATA_TEST_SECRET';

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const sqlite3 = require('sqlite3');
const { inspectSnapshot } = require('../acceptance/readOnlyInventory');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gallery-acceptance-'));
after(() => fs.rmSync(root, { recursive: true, force: true }));

function setup(filename, statements) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(filename, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, e => {
      if (e) return reject(e);
      db.exec(statements, error => {
        db.close(closeError => error || closeError ? reject(error || closeError) : resolve());
      });
    });
  });
}
const schema = [
  'CREATE TABLE users(user_id INTEGER PRIMARY KEY)',
  'CREATE TABLE orders(order_id INTEGER PRIMARY KEY, status TEXT, expires_at TEXT)',
  'CREATE TABLE order_items(id INTEGER PRIMARY KEY, order_id INTEGER, item_type TEXT, item_id INTEGER, quantity INTEGER)',
  'CREATE TABLE reservations(reservation_id INTEGER PRIMARY KEY, order_id INTEGER, event_id INTEGER, status TEXT, participant_count INTEGER)',
  'CREATE TABLE events(event_id INTEGER PRIMARY KEY, price REAL, capacity INTEGER, current_registrations INTEGER)',
  'CREATE TABLE artworks(artwork_id INTEGER PRIMARY KEY, stock_quantity INTEGER)',
  'CREATE TABLE order_status_audits(audit_id INTEGER PRIMARY KEY, order_id INTEGER, action TEXT)'
].join(';\n') + ';\n';
const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

test('consistent empty offline snapshot creates aggregate-only report without approval', async () => {
  const file = path.join(root, 'empty.sqlite');
  await setup(file, schema);
  const before = sha256(file);
  const report = await inspectSnapshot(file);
  assert.equal(report.integrity, 'ok');
  assert.equal(report.disposition, 'no_automatic_flags_found_not_production_approval');
  assert.deepEqual(report.schema.missing_required_tables, []);
  assert.ok(report.checks.every(f => f.status === 'no_flags'));
  assert.equal(sha256(file), before);
  assert.equal(report.external_bank_verification_performed, false);
});

test('legacy discrepancies are counted but identifiers and bank details are never exported', async () => {
  const file = path.join(root, 'legacy.sqlite');
  const records = [
    "INSERT INTO users VALUES(1001)",
    "INSERT INTO orders VALUES(10,'paid',NULL)",
    "INSERT INTO orders VALUES(11,'pending',NULL)",
    "INSERT INTO events VALUES(50,60,1,2)",
    "INSERT INTO reservations VALUES(70,NULL,50,'confirmed',1)",
    "INSERT INTO order_items VALUES(30,10,'event',50,1)",
    "INSERT INTO artworks VALUES(90,-1)"
  ].join(';\n') + ';';
  await setup(file, schema + records);
  const originalHash = sha256(file);
  const report = await inspectSnapshot(file);
  const counts = Object.fromEntries(report.checks.map(f => [f.key, f.count]));
  assert.equal(report.disposition, 'manual_review_required');
  assert.equal(counts.oversubscribed_events, 1);
  assert.equal(counts.event_seat_count_discrepancy, 1);
  assert.equal(counts.negative_artwork_stock, 1);
  assert.equal(counts.pending_orders_without_expiry, 1);
  assert.equal(counts.settled_orders_without_manual_bank_audit, 1);
  assert.equal(counts.unlinked_paid_event_reservations, 1);
  assert.equal(counts.event_order_items_without_matched_booking, 1);
  assert.equal(sha256(file), originalHash);
  const output = JSON.stringify(report);
  for (const identifier of ['1001', 'legacy@example.invalid', 'BANK-SECRET-123']) {
    assert.ok(!output.includes(identifier));
  }
});

test('older schema without audit and reservation link is not misreported as clean', async () => {
  const file = path.join(root, 'partial.sqlite');
  await setup(file, schema.replace(
    'CREATE TABLE order_status_audits(audit_id INTEGER PRIMARY KEY, order_id INTEGER, action TEXT);',
    '').replace('order_id INTEGER, event_id INTEGER, status TEXT,', 'event_id INTEGER, status TEXT,'));
  const result = await inspectSnapshot(file);
  assert.equal(result.disposition, 'manual_review_required');
  assert.ok(result.schema.missing_required_tables.includes('order_status_audits'));
  assert.equal(result.schema.has_reservation_order_link, false);
  assert.equal(result.checks.find(f => f.key === 'event_order_items_without_matched_booking').status,
    'not_evaluable');
});

test('CLI requires explicit operator acknowledgement of an offline copy', () => {
  const toolPath = path.join(__dirname, '..', 'acceptance', 'readOnlyInventory.js');
  const file = path.join(root, 'empty.sqlite');
  const noAcknowledgement = spawnSync(process.execPath,
    [toolPath, '--file', file], { encoding: 'utf8' });
  assert.equal(noAcknowledgement.status, 1);
  assert.match(noAcknowledgement.stderr, /--offline-copy/);
  const confirmed = spawnSync(process.execPath,
    [toolPath, '--file', file, '--offline-copy'], { encoding: 'utf8' });
  assert.equal(confirmed.status, 0, confirmed.stderr);
  assert.equal(JSON.parse(confirmed.stdout).integrity, 'ok');
});

test('corrupt snapshot is refused without changing its contents', async () => {
  const file = path.join(root, 'corrupt.sqlite');
  fs.writeFileSync(file, Buffer.from('not-a-real-sqlite-database'));
  const before = sha256(file);
  await assert.rejects(inspectSnapshot(file), /SQLite database header/);
  assert.equal(sha256(file), before);
});
