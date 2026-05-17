const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ReviewReply = sequelize.define('ReviewReply', {
  reply_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  review_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'reviews', key: 'review_id' }
  },
  replier_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'user_id' }
  },
  reply_text: {
    type: DataTypes.TEXT,
    allowNull: false
  }
}, {
  tableName: 'review_replies',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = ReviewReply;
