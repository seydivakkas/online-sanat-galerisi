const fs = require('node:fs');
const path = require('node:path');
const { DataTypes } = require('sequelize');
const { sequelize, OrderStatusAudit } = require('../models');

const REQUIRED = ['users', 'orders', 'reservations'];

async function inspectSchema() {
  const qi = sequelize.getQueryInterface();
  const tables = (await qi.showAllTables()).map(t =>
    typeof t === 'string' ? t : (t.tableName || t.name));
  if (!REQUIRED.every(t => tables.includes(t))) {
    return { initialized: false, missingTables: REQUIRED.filter(t => !tables.includes(t)) };
  }
  const orders = await qi.describeTable('orders');
  const reservations = await qi.describeTable('reservations');
  const auditExists = tables.includes('order_status_audits');
  const audit = auditExists ? await qi.describeTable('order_status_audits') : null;
  return {
    initialized: true, auditExists,
    missingOrderExpiry: !orders.expires_at,
    missingReservationLink: !reservations.order_id,
    auditActorNonNullable: !!(audit && audit.actor_id && audit.actor_id.allowNull === false)
  };
}

async function assertSchemaReady() {
  const state = await inspectSchema();
  if (!state.initialized || !state.auditExists || state.missingOrderExpiry ||
    state.missingReservationLink || state.auditActorNonNullable) {
    throw new Error('Database schema is not P2-ready. Stop the server; run node migrations/runner.js --plan then --apply after backup.');
  }
  return state;
}

async function sqliteBackup() {
  const filename = sequelize.options.storage;
  if (!filename || filename === ':memory:') return null;
  const absolute = path.resolve(filename);
  if (!fs.existsSync(absolute)) return null;
  const info = fs.lstatSync(absolute);
  if (!info.isFile() || info.isSymbolicLink()) throw new Error('Unsafe SQLite database path');
  const backupPath = absolute + '.pre-p2-' +
    new Date().toISOString().replace(/[:.]/g, '-') + '.backup';
  if (fs.existsSync(backupPath)) throw new Error('SQLite backup already exists');
  // SQLite itself creates a transactionally consistent backup, including WAL
  // state; unlike copying an active .sqlite file, VACUUM INTO is safe.
  await sequelize.query('VACUUM INTO ' + sequelize.escape(backupPath));
  return backupPath;
}

async function applyMigrations({ initEmpty = false, backup = true } = {}) {
  let state = await inspectSchema();
  if (!state.initialized && !initEmpty) {
    throw new Error('Missing core tables. Use --init-empty ONLY for a brand-new empty database.');
  }
  if (!state.initialized && initEmpty) {
    // Initial schema creation never truncates or alters existing tables.
    const tables = await sequelize.getQueryInterface().showAllTables();
    if (tables.length) throw new Error('Refusing --init-empty: database has tables');
  }

  if (sequelize.getDialect() === 'postgres' &&
    process.env.MIGRATION_BACKUP_CONFIRMED !== 'YES') {
    throw new Error('PostgreSQL requires separately verified backup: MIGRATION_BACKUP_CONFIRMED=YES');
  }

  const backupPath = backup && sequelize.getDialect() === 'sqlite'
    ? await sqliteBackup() : null;
  if (!state.initialized) {
    await sequelize.sync(); // explicitly requested empty database only
    state = await inspectSchema();
    await assertSchemaReady();
    return { initialized: true, backupPath, changes: ['initialized empty schema'] };
  }

  const qi = sequelize.getQueryInterface();
  const changes = [];
  await sequelize.transaction(async transaction => {
    if (state.missingOrderExpiry) {
      await qi.addColumn('orders', 'expires_at', {
        type: DataTypes.DATE, allowNull: true
      }, { transaction });
      changes.push('orders.expires_at');
    }
    if (state.missingReservationLink) {
      await qi.addColumn('reservations', 'order_id', {
        type: DataTypes.INTEGER, allowNull: true,
        references: { model: 'orders', key: 'order_id' }
      }, { transaction });
      changes.push('reservations.order_id');
    }
    if (!state.auditExists) {
      await OrderStatusAudit.sync({ transaction });
      changes.push('order_status_audits');
    } else if (state.auditActorNonNullable) {
      // Sequelize SQLite dialect rebuilds this single table during
      // changeColumn. An intact snapshot was made before any DDL change.
      await qi.changeColumn('order_status_audits', 'actor_id', {
        type: DataTypes.INTEGER, allowNull: true,
        references: { model: 'users', key: 'user_id' }
      }, { transaction });
      changes.push('order_status_audits.actor_id nullable');
    }
  });
  await assertSchemaReady();
  return { initialized: true, backupPath, changes };
}

async function main() {
  const initEmpty = process.argv.includes('--init-empty');
  const plan = process.argv.includes('--plan');
  const apply = process.argv.includes('--apply');
  if ((plan ? 1 : 0) + (apply ? 1 : 0) !== 1) {
    throw new Error('Choose exactly one: --plan or --apply [--init-empty]');
  }
  await sequelize.authenticate();
  try {
    if (plan) {
      console.log(JSON.stringify(await inspectSchema(), null, 2));
      return;
    }
    console.log(JSON.stringify(await applyMigrations({ initEmpty }), null, 2));
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  main().catch(err => { console.error('MIGRATION REFUSED:', err.message); process.exitCode = 1; });
}
module.exports = { inspectSchema, assertSchemaReady, applyMigrations };
