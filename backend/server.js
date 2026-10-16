const express = require('express');
const cors = require('cors');
const path = require('path');
const { sequelize } = require('./models');
const { sendError } = require('./utils/response');
const { expirePendingOrders } = require('./services/orderHolds');
const { assertSchemaReady } = require('./migrations/runner');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || (process.env.NODE_ENV === 'local' ? '127.0.0.1' : '0.0.0.0');

// Middleware
const allowedOrigins = new Set((process.env.CORS_ORIGINS || '').split(',')
  .map(origin => origin.trim()).filter(Boolean));
if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.add('http://localhost:5173');
  allowedOrigins.add('http://127.0.0.1:5173');
}
app.use(cors({
  origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin))
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff')
}));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/artworks', require('./routes/artworks'));
app.use('/api/artists', require('./routes/artists'));
app.use('/api/categories', require('./routes/artists')); // categories endpoint artists içinde
app.use('/api/events', require('./routes/events'));
app.use('/api/favorites', require('./routes/favorites'));
app.use('/api/reservations', require('./routes/reservations'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/coupons', require('./routes/coupons'));
app.use('/api/support', require('./routes/support'));
app.use('/api/compare', require('./routes/compare'));
app.use('/api/admin', require('./routes/admin'));

// Sağlık kontrolü
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Optional Windows offline build: serve Vite files and APIs from ONE server.
const frontendDist = path.resolve(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(path.join(frontendDist, 'index.html'))) {
  app.use(express.static(frontendDist, { index: false }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) return next();
    return res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Hata yönetimi
app.use((err, req, res, next) => {
  console.error('Sunucu hatası:', err.stack);
  sendError(res, 'Sunucuda bir hata oluştu', 500);
});

// Veritabanı senkronizasyonu ve sunucu başlatma
async function start() {
  try {
    await sequelize.authenticate();
    console.log('Veritabanı bağlantısı başarılı');
    if (process.env.NODE_ENV !== 'production') {
      // Fresh development databases can create missing tables; this does
      // not alter legacy columns and is NOT a production migration.
      await sequelize.sync();
    }
    await assertSchemaReady();
    console.log('P2 şeması doğrulandı');
    await expirePendingOrders();

    // Background safety net: expired unpaid holds are also released on
    // order reads/creation/verification. Multi-worker races use CAS updates.
    const sweeper = setInterval(() => {
      expirePendingOrders().catch(err => console.error('Stok ayırma süresi temizleme hatası:', err));
    }, 60 * 1000);
    sweeper.unref();

    app.listen(PORT, HOST, () => {
      console.log(`Sunucu http://${HOST}:${PORT} adresinde çalışıyor`);
    });
  } catch (err) {
    console.error('Başlatma hatası:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

module.exports = app;
