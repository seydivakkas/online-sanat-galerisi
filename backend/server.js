const express = require('express');
const cors = require('cors');
const path = require('path');
const { sequelize } = require('./models');
const { sendError } = require('./utils/response');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
    await sequelize.sync();
    console.log('Tablolar senkronize edildi');

    app.listen(PORT, () => {
      console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor`);
    });
  } catch (err) {
    console.error('Başlatma hatası:', err);
    process.exit(1);
  }
}

start();

module.exports = app;
