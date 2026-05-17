const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ReviewVote = sequelize.define('ReviewVote', {
  vote_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  review_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'reviews', key: 'review_id' }
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'user_id' }
  },
  is_helpful: {
    type: DataTypes.BOOLEAN,
    allowNull: false
  }
}, {
  tableName: 'review_votes',
  timestamps: false,
  indexes: [
    { unique: true, fields: ['review_id', 'user_id'] }
  ]
});

module.exports = ReviewVote;
