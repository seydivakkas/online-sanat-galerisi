// Minimal P0.1 security integration checks. Run against an isolated, in-memory
// SQLite database. No production database, third-party service or paid API.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'P0_1_TEST_ONLY_random_and_nonproduction_key_2026';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { sequelize, User, Artist, Category } = require('../models');
const app = require('../server');

const uploadsPath = path.join(__dirname, '..', 'uploads');
let server;
let baseUrl;
let users;
let artist;
let category;

function signed(user, role = user.role) {
  return jwt.sign({ id: user.user_id, role }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

function formFor({ bytes, name = 'sample.png', mime = 'image/png' } = {}) {
  const fd = new FormData();
  fd.set('title', 'Security test art');
  fd.set('description', 'P0.1 image smoke test');
  fd.set('artist_id', String(artist.artist_id));
  fd.set('category_id', String(category.category_id));
  fd.set('price', '40');
  fd.set('stock_quantity', '1');
  if (bytes) fd.set('image', new Blob([bytes], { type: mime }), name);
  return fd;
}
const imagePng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLytQAAAABJRU5ErkJggg==',
  'base64'
);

async function createArtwork(token, form) {
  return fetch(baseUrl + '/api/artworks', {
    method: 'POST',
    headers: token ? { Authorization: 'Bearer ' + token } : undefined,
    body: form
  });
}

function diskSnapshot() {
  return fs.readdirSync(uploadsPath).sort();
}

before(async () => {
  await sequelize.sync({ force: true }); // in-memory database only
  const hash = await bcrypt.hash('demo-password-for-test', 8);
  users = {};
  for (const [key, role] of [
    ['admin', 'admin'], ['manager', 'gallery_manager'],
    ['customer', 'customer'], ['inactive', 'customer']
  ]) {
    users[key] = await User.create({
      username: 'p01_' + key,
      email: 'p01_' + key + '@example.invalid',
      password_hash: hash,
      is_active: key !== 'inactive',
      role
    });
  }
  artist = await Artist.create({ name: 'P01 Test Artist' });
  category = await Category.create({ name: 'P01 Test Category' });
  fs.mkdirSync(uploadsPath, { recursive: true });
  server = await new Promise((resolve) => {
    const socket = app.listen(0, '127.0.0.1', () => resolve(socket));
  });
  baseUrl = 'http://127.0.0.1:' + server.address().port;
});

after(async () => {
  if (server) await new Promise((resolve, reject) =>
    server.close((err) => err ? reject(err) : resolve()));
  await sequelize.close();
});

test('JWT secret must be configured and at least 32 bytes', () => {
  for (const secret of ['', 'too-short']) {
    const result = spawnSync(process.execPath, ['-e', "require('./middleware/auth')"], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, JWT_SECRET: secret },
      encoding: 'utf8'
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /JWT_SECRET must be set/);
  }
});

test('public artworks browsing remains available', async () => {
  const res = await fetch(baseUrl + '/api/artworks');
  assert.equal(res.status, 200);
});

test('missing or invalid tokens cannot create artworks', async () => {
  let r = await createArtwork(null, formFor({ bytes: imagePng }));
  assert.equal(r.status, 401);
  r = await createArtwork('invalid-token', formFor({ bytes: imagePng }));
  assert.equal(r.status, 401);
});

test('customer role cannot create artworks, even when JWT claims admin', async () => {
  const original = diskSnapshot();
  const r = await createArtwork(signed(users.customer, 'admin'), formFor({ bytes: imagePng }));
  assert.equal(r.status, 403);
  assert.deepEqual(diskSnapshot(), original, 'unauthorized upload must not write a file');
});

test('inactive accounts cannot sign in or call authenticated endpoints', async () => {
  const login = await fetch(baseUrl + '/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: users.inactive.email, password: 'demo-password-for-test' })
  });
  assert.equal(login.status, 401);
  const create = await createArtwork(signed(users.inactive), formFor({ bytes: imagePng }));
  assert.equal(create.status, 401);
});

test('a suspended user loses access immediately', async () => {
  const token = signed(users.customer);
  await users.customer.update({ is_active: false });
  const res = await fetch(baseUrl + '/api/favorites', {
    headers: { Authorization: 'Bearer ' + token }
  });
  assert.equal(res.status, 401);
  await users.customer.update({ is_active: true });
});

test('previously issued admin token loses privileges on role demotion', async () => {
  const token = signed(users.admin);
  await users.admin.update({ role: 'customer' });
  const res = await createArtwork(token, formFor({ bytes: imagePng }));
  assert.equal(res.status, 403);
  await users.admin.update({ role: 'admin' });
});

test('unsupported MIME types and mismatched image signature are rejected', async () => {
  const beforeFiles = diskSnapshot();
  let r = await createArtwork(signed(users.manager),
    formFor({ bytes: imagePng, name: 'sample.png', mime: 'text/plain' }));
  assert.equal(r.status, 400);
  r = await createArtwork(signed(users.manager),
    formFor({ bytes: Buffer.from('not a PNG'), name: 'sample.png', mime: 'image/png' }));
  assert.equal(r.status, 400);
  assert.deepEqual(diskSnapshot(), beforeFiles, 'rejected uploads must not linger on disk');
});

test('image upload size limit produces 400 and cleans up partial uploads', async () => {
  const beforeFiles = diskSnapshot();
  const big = Buffer.alloc(5 * 1024 * 1024 + 256, 0x2a);
  const r = await createArtwork(signed(users.manager), formFor({ bytes: big }));
  assert.equal(r.status, 400);
  assert.deepEqual(diskSnapshot(), beforeFiles);
});

test('active admin/manager upload remains functional with correct response headers', async () => {
  for (const who of [users.admin, users.manager]) {
    const beforeFiles = diskSnapshot();
    const r = await createArtwork(signed(who), formFor({ bytes: imagePng }));
    assert.equal(r.status, 201, await r.text().catch(() => ''));
    const afterFiles = diskSnapshot();
    const fresh = afterFiles.filter((name) => !beforeFiles.includes(name));
    assert.equal(fresh.length, 1);
    const imageResponse = await fetch(baseUrl + '/uploads/' + fresh[0]);
    assert.equal(imageResponse.status, 200);
    assert.equal(imageResponse.headers.get('x-content-type-options'), 'nosniff');
    await fs.promises.unlink(path.join(uploadsPath, fresh[0]));
  }
});
