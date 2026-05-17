const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Event = sequelize.define('Event', {
  event_id: {
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
  event_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  event_time: {
    type: DataTypes.STRING(5),
    allowNull: false
  },
  duration_minutes: {
    type: DataTypes.INTEGER
  },
  capacity: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  current_registrations: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  price: {
    type: DataTypes.DECIMAL(10, 2)
  },
  location: {
    type: DataTypes.STRING(200)
  },
  organizer_id: {
    type: DataTypes.INTEGER,
    references: { model: 'users', key: 'user_id' }
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'events',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = Event;
