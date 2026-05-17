const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Artwork = sequelize.define('Artwork', {
  artwork_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(150),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  artist_id: {
    type: DataTypes.INTEGER,
    references: { model: 'artists', key: 'artist_id' }
  },
  category_id: {
    type: DataTypes.INTEGER,
    references: { model: 'categories', key: 'category_id' }
  },
  price: {
    type: DataTypes.DECIMAL(10, 2)
  },
  stock_quantity: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  image_url: {
    type: DataTypes.STRING(255)
  },
  view_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  is_available: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'artworks',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = Artwork;
