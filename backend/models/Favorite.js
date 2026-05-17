const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Favorite = sequelize.define('Favorite', {
  favorite_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'user_id' }
  },
  artwork_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'artworks', key: 'artwork_id' }
  },
  added_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'favorites',
  timestamps: false,
  indexes: [
    { unique: true, fields: ['user_id', 'artwork_id'] }
  ]
});

module.exports = Favorite;
