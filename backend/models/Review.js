const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Review = sequelize.define('Review', {
  review_id: {
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
    references: { model: 'artworks', key: 'artwork_id' }
  },
  event_id: {
    type: DataTypes.INTEGER,
    references: { model: 'events', key: 'event_id' }
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1, max: 5 }
  },
  comment: {
    type: DataTypes.TEXT
  },
  is_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'reviews',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  validate: {
    atLeastOneTarget() {
      if (!this.artwork_id && !this.event_id) {
        throw new Error('En az bir hedef (artwork_id veya event_id) belirtilmelidir');
      }
    }
  }
});

module.exports = Review;
