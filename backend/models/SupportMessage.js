const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SupportMessage = sequelize.define('SupportMessage', {
  message_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  ticket_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'support_tickets', key: 'ticket_id' }
  },
  sender_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'user_id' }
  },
  message_text: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  sent_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'support_messages',
  timestamps: false
});

module.exports = SupportMessage;
