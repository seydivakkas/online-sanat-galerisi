'use strict';

/**
 * Operator-only preparation for a real SQLite acceptance review.
 * NEVER connects to a network, creates GitHub artifacts, or mutates the source.
 * Source must be stopped/offline; OPEN_READONLY plus VACUUM INTO creates a
 * consistent destination even when the source uses the SQLite WAL format.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sqlite3 = require('sqlite3');
const { inspectSnapshot } = require('./readOnlyInventory');

const open = source => new Promise((resolve, reject) => {
  const db = new sqlite3.Database(source, sqlite3.OPEN_READONLY,
    err => err ? reject(err) : resolve(db));
});
const execute = (db, query) => new Promise((resolve, reject) =>
  db.exec(query, err => err ? reject(err) : resolve()));
const close = db => new Promise((resolve, reject) =>
  db.close(err => err ? reject(err) : resolve()));

function sha256(filename) {
  const hash = crypto.createHash('sha256');
  const fd = fs.openSync(filename, 'r');
  const buf = Buffer.alloc(1024 * 1024);
  try {
    let bytes;
    while ((bytes = fs.readSync(fd, buf, 0, buf.length, null)) > 0) {
      hash.update(buf.subarray(0, bytes));
    }
  } finally {
    fs.closeSync(fd);
  }
  return hash.digest('hex');
}

function assertInput(source, destDir) {
  if (!path.isAbsolute(source) || !path.isAbsolute(destDir)) {
    throw new Error('Source and output directory must be ABSOLUTE local paths');
  }
  const src = path.resolve(source);
  const dir = path.resolve(destDir);
  const sourceStat = fs.lstatSync(src);
  const dirStat = fs.lstatSync(dir);
  if (!sourceStat.isFile() || sourceStat.isSymbolicLink()) {
    throw new Error('Source must be an existing, regular SQLite file (no symlinks)');
  }
  if (!dirStat.isDirectory() || dirStat.isSymbolicLink()) {
    throw new Error('Output must be an existing private directory (no symlinks)');
  }
  if (fs.realpathSync.native(src) !== src || fs.realpathSync.native(dir) !== dir) {
    throw new Error('Canonical paths required; junctions/symlinks are not allowed');
  }
  if (dir === path.dirname(src)) {
    throw new Error('Choose a separate protected directory for the snapshot');
  }
  // Do not leave copies containing PII in repositories or their subdirectories.
  for (let ancestor = dir; ; ancestor = path.dirname(ancestor)) {
    if (fs.existsSync(path.join(ancestor, '.git'))) {
      throw new Error('Refusing to write customer data within a Git worktree');
    }
    const next = path.dirname(ancestor);
    if (next === ancestor) break;
  }
  const header = Buffer.alloc(16);
  const fd = fs.openSync(src, 'r');
  try {
    if (fs.readSync(fd, header, 0, 16, 0) !== 16 ||
        !header.equals(Buffer.from('SQLite format 3\0', 'ascii'))) {
      throw new Error('Source has no valid SQLite database header');
    }
  } finally { fs.closeSync(fd); }
  return { src, dir };
}

async function prepareOfflineSnapshot(source, destDir) {
  const { src, dir } = assertInput(source, destDir);
  const outputFolder = fs.mkdtempSync(path.join(dir, 'gallery-acceptance-'));
  const snapshot = path.join(outputFolder, 'snapshot.sqlite');
  let db;
  try {
    db = await open(src);
    // The source connection is READONLY. VACUUM INTO writes only a new target.
    // Single quotes in Windows paths are escaped for SQL string literals.
    await execute(db, "VACUUM INTO '" + snapshot.replace(/'/g, "''") + "'");
    await close(db);
    db = null;

    const inventory = await inspectSnapshot(snapshot);
    if (inventory.integrity !== 'ok') throw new Error('Snapshot quick_check failed');

    // Independent restore rehearsal, still entirely inside protected local
    // backup area. This verifies a newly opened copy, not just the first DB.
    const restoreDir = fs.mkdtempSync(path.join(outputFolder, 'restore-check-'));
    const restoredFile = path.join(restoreDir, 'restored.sqlite');
    try {
      fs.copyFileSync(snapshot, restoredFile, fs.constants.COPYFILE_EXCL);
      const independentlyRead = await inspectSnapshot(restoredFile);
      if (independentlyRead.integrity !== 'ok' ||
          JSON.stringify(independentlyRead.table_counts) !== JSON.stringify(inventory.table_counts) ||
          JSON.stringify(independentlyRead.checks) !== JSON.stringify(inventory.checks)) {
        throw new Error('Independent restore or aggregate comparison failed');
      }
    } finally {
      fs.rmSync(restoreDir, { recursive: true, force: true });
    }
    const result = {
      result: 'snapshot_created_and_independent_restore_checked',
      created_utc: new Date().toISOString(),
      snapshot_sha256: sha256(snapshot),
      snapshot_bytes: fs.statSync(snapshot).size,
      source_mutated_by_tool: false,
      bank_records_independently_verified: false,
      production_approved: false,
      inventory
    };
    fs.writeFileSync(path.join(outputFolder, 'local-report.json'),
      JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    return { snapshot, report: path.join(outputFolder, 'local-report.json'), ...result };
  } catch (err) {
    // Only delete the private directory created in this invocation; source
    // path and any existing backup directories are never touched.
    fs.rmSync(outputFolder, { recursive: true, force: true });
    throw err;
  } finally {
    if (db) await close(db);
  }
}

function parseArgs(argv) {
  if (argv.length !== 4 || argv[0] !== '--source' || argv[2] !== '--output-dir' ||
      !argv[1] || !argv[3]) {
    throw new Error('Usage: node acceptance/prepareOfflineSnapshot.js --source "C:\\absolute\\gallery.sqlite" --output-dir "D:\\protected-backups"');
  }
  return { source: argv[1], dir: argv[3] };
}

if (require.main === module) {
  (async () => {
    const { source, dir } = parseArgs(process.argv.slice(2));
    const output = await prepareOfflineSnapshot(source, dir);
    // This log remains local. Do not upload snapshot, path or raw report.
    console.log(JSON.stringify({
      snapshot_location: output.snapshot,
      local_report_location: output.report,
      snapshot_sha256: output.snapshot_sha256,
      snapshot_bytes: output.snapshot_bytes,
      integrity: output.inventory.integrity,
      disposition: output.inventory.disposition,
      independent_restore: 'pass',
      warning: 'DATA IS SENSITIVE; DO NOT UPLOAD THE SNAPSHOT TO GIT OR CHAT'
    }, null, 2));
    if (output.inventory.disposition === 'manual_review_required') process.exitCode = 2;
  })().catch(err => {
    console.error('OFFLINE SNAPSHOT REFUSED:', err.message);
    process.exitCode = 1;
  });
}

module.exports = { prepareOfflineSnapshot, assertInput };
