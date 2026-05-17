const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const OrderItem = sequelize.define('OrderItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  order_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'orders', key: 'order_id' }
  },
  item_type: {
    type: DataTypes.ENUM('artwork', 'event'),
    allowNull: false
  },
  item_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1 }
  },
  unit_price: {
    type: DataTypes.DECIMAL(10, 2)
  }
}, {
  tableName: 'order_items',
  timestamps: false
});

module.exports = OrderItem;
