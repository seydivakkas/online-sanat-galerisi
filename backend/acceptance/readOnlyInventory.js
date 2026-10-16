'use strict';

// Read-only inventory of an OFFLINE SQLite snapshot (not a live database).
// Aggregate counts only. No customer names, bank references, row identifiers,
// messages or password hashes are written to the report.
const fs = require('node:fs');
const path = require('node:path');
const sqlite3 = require('sqlite3');

const REQUIRED = ['users', 'orders', 'order_items', 'reservations',
  'events', 'artworks', 'order_status_audits'];
const OPTIONAL = ['coupons', 'support_tickets'];
const sqlAll = (db, sql) => new Promise((resolve, reject) =>
  db.all(sql, [], (e, rows) => e ? reject(e) : resolve(rows)));
const scalar = async (db, sql) => Number((await sqlAll(db, sql))[0]?.n || 0);
const openReadOnly = file => new Promise((resolve, reject) => {
  const db = new sqlite3.Database(file, sqlite3.OPEN_READONLY, e => e ? reject(e) : resolve(db));
});
const close = db => new Promise((resolve, reject) =>
  db.close(e => e ? reject(e) : resolve()));

function validateSnapshot(file) {
  if (typeof file !== 'string' || !path.isAbsolute(file)) {
    throw new Error('Use an absolute path to an offline SQLite snapshot');
  }
  const info = fs.lstatSync(file);
  if (!info.isFile() || info.isSymbolicLink()) throw new Error('Not a regular SQLite file');
  const fd = fs.openSync(file, 'r');
  try {
    const header = Buffer.alloc(16);
    if (fs.readSync(fd, header, 0, 16, 0) !== 16 ||
        !header.equals(Buffer.from('SQLite format 3\0', 'ascii'))) {
      throw new Error('File does not have a SQLite database header');
    }
  } finally { fs.closeSync(fd); }
}

async function inspectSnapshot(file) {
  validateSnapshot(file);
  const db = await openReadOnly(file);
  try {
    await sqlAll(db, 'PRAGMA query_only = ON');
    const rawTables = await sqlAll(db,
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
    const present = new Set(rawTables.map(r => r.name));
    const tables = {};
    const columns = {};
    for (const name of [...REQUIRED, ...OPTIONAL]) {
      if (!present.has(name)) continue;
      tables[name] = await scalar(db, 'SELECT COUNT(*) AS n FROM "' + name + '"');
      columns[name] = new Set(
        (await sqlAll(db, 'PRAGMA table_info("' + name + '")')).map(r => r.name));
    }
    const missing = REQUIRED.filter(name => !present.has(name));
    const quick = await sqlAll(db, 'PRAGMA quick_check');
    const integrity = quick.length === 1 && Object.values(quick[0])[0] === 'ok'
      ? 'ok' : 'review_required';
    const checks = [];
    function add(key, count, explanation) {
      checks.push({
        key, count,
        status: count === null ? 'not_evaluable' : count > 0 ? 'manual_review' : 'no_flags',
        explanation
      });
    }
    const has = (...requirements) => requirements.every(([name, column]) =>
      present.has(name) && (!column || columns[name]?.has(column)));

    add('foreign_key_violations', missing.length ? null :
      await scalar(db, 'SELECT COUNT(*) AS n FROM pragma_foreign_key_check'),
      'Foreign keys whose referenced rows are missing');
    add('oversubscribed_events',
      has(['events', 'capacity'], ['events', 'current_registrations'])
        ? await scalar(db, 'SELECT COUNT(*) AS n FROM events WHERE current_registrations < 0 OR capacity < 0 OR current_registrations > capacity')
        : null, 'Events over capacity or carrying invalid counts');
    add('event_seat_count_discrepancy',
      has(['events', 'current_registrations'], ['reservations', 'event_id'],
        ['reservations', 'participant_count'], ['reservations', 'status'])
        ? await scalar(db, "SELECT COUNT(*) AS n FROM events e " +
            "LEFT JOIN (SELECT event_id, SUM(participant_count) AS seats " +
            "FROM reservations WHERE status IN ('pending', 'confirmed') " +
            "GROUP BY event_id) r ON r.event_id = e.event_id " +
            "WHERE COALESCE(e.current_registrations, 0) <> COALESCE(r.seats, 0)")
        : null, 'Reported seats differ from active reservation totals');
    add('negative_artwork_stock', has(['artworks', 'stock_quantity'])
      ? await scalar(db, 'SELECT COUNT(*) AS n FROM artworks WHERE stock_quantity < 0')
      : null, 'Artworks whose stock count is below zero');
    add('pending_orders_without_expiry', has(['orders', 'status'])
      ? await scalar(db, columns.orders.has('expires_at')
        ? "SELECT COUNT(*) AS n FROM orders WHERE status='pending' AND expires_at IS NULL"
        : "SELECT COUNT(*) AS n FROM orders WHERE status='pending'")
      : null, 'Legacy pending orders lacking an expiry policy');
    add('settled_orders_without_manual_bank_audit',
      has(['orders', 'status'], ['orders', 'order_id'])
        ? await scalar(db, has(['order_status_audits', 'order_id'], ['order_status_audits', 'action'])
          ? "SELECT COUNT(*) AS n FROM orders o " +
            "WHERE o.status IN ('paid','shipped','delivered') AND NOT EXISTS " +
            "(SELECT 1 FROM order_status_audits a WHERE a.order_id=o.order_id " +
            "AND a.action='manual_bank_attestation')"
          : "SELECT COUNT(*) AS n FROM orders WHERE status IN ('paid','shipped','delivered')")
        : null, 'Settled orders without an application-recorded bank attestation');
    add('unlinked_paid_event_reservations',
      has(['reservations', 'event_id'], ['reservations', 'status'],
        ['events', 'event_id'], ['events', 'price'])
        ? await scalar(db, "SELECT COUNT(*) AS n FROM reservations r " +
            "JOIN events e ON e.event_id=r.event_id " +
            "WHERE r.status IN ('pending','confirmed') AND e.price > 0" +
            (columns.reservations.has('order_id') ? ' AND r.order_id IS NULL' : ''))
        : null, 'Active paid-event reservations without order linkage');
    add('event_order_items_without_matched_booking',
      has(['order_items', 'item_type'], ['order_items', 'item_id'],
        ['order_items', 'order_id'], ['order_items', 'quantity'],
        ['reservations', 'order_id'], ['reservations', 'event_id'],
        ['reservations', 'participant_count'])
        ? await scalar(db, "SELECT COUNT(*) AS n FROM order_items oi " +
            "WHERE oi.item_type='event' AND NOT EXISTS (SELECT 1 FROM reservations r " +
            "WHERE r.order_id=oi.order_id AND r.event_id=oi.item_id " +
            "AND r.participant_count=oi.quantity)")
        : null, 'Ticket order items without a matching linked reservation');
    add('orphan_order_items',
      has(['order_items', 'order_id'], ['orders', 'order_id'])
        ? await scalar(db, 'SELECT COUNT(*) AS n FROM order_items oi ' +
            'LEFT JOIN orders o ON o.order_id=oi.order_id WHERE o.order_id IS NULL')
        : null, 'Order item referencing a missing order');

    return {
      inspection_type: 'offline_read_only_sqlite_aggregate',
      external_bank_verification_performed: false,
      customer_identifiers_in_output: false,
      schema: {
        missing_required_tables: missing,
        has_order_expiry: !!columns.orders?.has('expires_at'),
        has_reservation_order_link: !!columns.reservations?.has('order_id'),
        has_audit_table: present.has('order_status_audits')
      },
      integrity, table_counts: tables, checks,
      disposition: missing.length || integrity !== 'ok' ||
        checks.some(c => c.status !== 'no_flags') ? 'manual_review_required' :
        'no_automatic_flags_found_not_production_approval'
    };
  } finally { await close(db); }
}

async function main(args) {
  const i = args.indexOf('--file');
  if (i === -1 || !args[i + 1] || !args.includes('--offline-copy') ||
    args.some(x => x.startsWith('--') && !['--file', '--offline-copy'].includes(x))) {
    throw new Error('Usage: node acceptance/readOnlyInventory.js --file "ABSOLUTE_OFFLINE_SNAPSHOT_PATH" --offline-copy');
  }
  const result = await inspectSnapshot(args[i + 1]);
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  if (result.disposition === 'manual_review_required') process.exitCode = 2;
}
if (require.main === module) {
  main(process.argv.slice(2)).catch(err => {
    console.error('READ-ONLY INSPECTION REFUSED:', err.message);
    process.exitCode = 1;
  });
}
module.exports = { inspectSnapshot };
