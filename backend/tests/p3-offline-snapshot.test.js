'use strict';
// Synthetic fixtures only — never open real customer data.
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const sqlite3 = require('sqlite3');
const { prepareOfflineSnapshot } = require('../acceptance/prepareOfflineSnapshot');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gallery-offline-snapshot-'));
const source = path.join(root, 'wal-source.sqlite');
const out = path.join(root, 'private-output');
fs.mkdirSync(out, { mode: 0o700 });
after(() => fs.rmSync(root, { recursive: true, force: true }));

const open = (file, flags = sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE) =>
  new Promise((resolve, reject) => {
    const db = new sqlite3.Database(file, flags,
      err => err ? reject(err) : resolve(db));
  });
const exec = (db, query) => new Promise((resolve, reject) =>
  db.exec(query, err => err ? reject(err) : resolve()));
const close = db => new Promise((resolve, reject) =>
  db.close(err => err ? reject(err) : resolve()));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

test('a readonly WAL-consistent snapshot includes commits and independently restores', async () => {
  const writer = await open(source);
  try {
    const queries = [
      'PRAGMA journal_mode=WAL',
      'CREATE TABLE users(user_id INTEGER PRIMARY KEY, email TEXT)',
      'CREATE TABLE orders(order_id INTEGER PRIMARY KEY, status TEXT, expires_at TEXT)',
      'CREATE TABLE order_items(id INTEGER PRIMARY KEY, order_id INTEGER, item_type TEXT, item_id INTEGER, quantity INTEGER)',
      'CREATE TABLE reservations(reservation_id INTEGER PRIMARY KEY, order_id INTEGER, event_id INTEGER, status TEXT, participant_count INTEGER)',
      'CREATE TABLE events(event_id INTEGER PRIMARY KEY, price REAL, capacity INTEGER, current_registrations INTEGER)',
      'CREATE TABLE artworks(artwork_id INTEGER PRIMARY KEY, stock_quantity INTEGER)',
      'CREATE TABLE order_status_audits(audit_id INTEGER PRIMARY KEY, order_id INTEGER, action TEXT)',
      "INSERT INTO users(user_id,email) VALUES(123456,'synthetic-secret@example.invalid')",
      "INSERT INTO orders(order_id,status,expires_at) VALUES(77,'pending','2099-01-01')",
      'INSERT INTO events(event_id,price,capacity,current_registrations) VALUES(13,0,5,0)'
    ];
    await exec(writer, queries.join(';\n') + ';');
    const originalHash = hash(source);
    const a = await prepareOfflineSnapshot(source, out);
    assert.equal(a.inventory.integrity, 'ok');
    assert.equal(a.inventory.table_counts.users, 1);
    assert.equal(a.inventory.table_counts.orders, 1);
    assert.equal(a.result, 'snapshot_created_and_independent_restore_checked');
    assert.equal(a.production_approved, false);
    assert.equal(a.bank_records_independently_verified, false);
    assert.equal(a.snapshot_sha256, hash(a.snapshot));
    assert.equal(hash(source), originalHash, 'source DB content changed');
    const report = fs.readFileSync(a.report, 'utf8');
    assert.ok(!report.includes('synthetic-secret@example.invalid'));
    assert.ok(!report.includes('123456'));
    const b = await prepareOfflineSnapshot(source, out);
    assert.notEqual(a.snapshot, b.snapshot, 'backup must never overwrite an earlier one');
    assert.equal(b.inventory.table_counts.users, 1);
  } finally { await close(writer); }
});

test('a Git worktree is never an acceptable destination', async () => {
  const folder = path.join(root, 'tracked-project');
  const dest = path.join(folder, 'backups');
  fs.mkdirSync(dest, { recursive: true });
  fs.mkdirSync(path.join(folder, '.git'));
  await assert.rejects(prepareOfflineSnapshot(source, dest), /Git worktree/);
  assert.deepEqual(fs.readdirSync(dest), []);
});

test('invalid, missing, symlink and source-directory inputs are rejected', async () => {
  await assert.rejects(prepareOfflineSnapshot(path.join(root, 'missing.sqlite'), out));
  const fake = path.join(root, 'not-database.sqlite');
  fs.writeFileSync(fake, 'invalid database');
  await assert.rejects(prepareOfflineSnapshot(fake, out), /header/);
  await assert.rejects(prepareOfflineSnapshot(source, root), /separate protected directory/);
  const link = path.join(root, 'linked.sqlite');
  try {
    fs.symlinkSync(source, link, 'file');
    await assert.rejects(prepareOfflineSnapshot(link, out), /symlinks/);
  } catch (err) {
    if (!['EPERM', 'EACCES'].includes(err.code)) throw err;
  }
});
