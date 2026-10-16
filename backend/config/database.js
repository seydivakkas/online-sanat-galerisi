const { Sequelize } = require('sequelize');
const path = require('path');

const env = process.env.NODE_ENV || 'development';

let sequelize;

if (env === 'production') {
  for (const key of ['DB_NAME', 'DB_USER', 'DB_PASS', 'DB_HOST']) {
    if (!process.env[key]) throw new Error(key + ' is required for PostgreSQL production');
  }
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      dialect: 'postgres',
      logging: false,
      pool: { max: 10, min: 2, idle: 10000 }
    }
  );
} else {
  const dataDir = process.env.ART_GALLERY_DATA_DIR;
  const storage = env === 'test' ? ':memory:' :
    (process.env.ART_GALLERY_SQLITE_PATH ||
      (dataDir ? path.resolve(dataDir, 'art-gallery.sqlite') :
        path.join(__dirname, '..', 'database.sqlite')));
  if (storage !== ':memory:') {
    require('fs').mkdirSync(path.dirname(path.resolve(storage)), { recursive: true });
  }
  sequelize = new Sequelize({
    dialect: 'sqlite', storage, logging: false
  });
}

module.exports = sequelize;
