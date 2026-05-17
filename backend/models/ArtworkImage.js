const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ArtworkImage = sequelize.define('ArtworkImage', {
  image_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  artwork_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'artworks', key: 'artwork_id' }
  },
  image_url: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  sort_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'artwork_images',
  timestamps: false
});

module.exports = ArtworkImage;
