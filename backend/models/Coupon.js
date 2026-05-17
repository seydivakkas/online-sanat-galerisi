const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Coupon = sequelize.define('Coupon', {
  coupon_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  code: {
    type: DataTypes.STRING(30),
    allowNull: false,
    unique: true
  },
  discount_percent: {
    type: DataTypes.DECIMAL(5, 2)
  },
  discount_amount: {
    type: DataTypes.DECIMAL(10, 2)
  },
  valid_from: {
    type: DataTypes.DATEONLY
  },
  valid_until: {
    type: DataTypes.DATEONLY
  },
  max_uses: {
    type: DataTypes.INTEGER
  },
  used_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  is_user_specific: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  target_user_id: {
    type: DataTypes.INTEGER,
    references: { model: 'users', key: 'user_id' }
  }
}, {
  tableName: 'coupons',
  timestamps: false
});

module.exports = Coupon;
