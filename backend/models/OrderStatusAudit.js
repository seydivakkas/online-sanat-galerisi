const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// An append-only record of privileged order state transitions.
// Payment reference is unique to prevent reusing a transfer for another order.
const OrderStatusAudit = sequelize.define('OrderStatusAudit', {
  audit_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  order_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'orders', key: 'order_id' } },
  actor_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'users', key: 'user_id' } },
  action: { type: DataTypes.STRING(40), allowNull: false },
  from_status: { type: DataTypes.STRING(20), allowNull: false },
  to_status: { type: DataTypes.STRING(20), allowNull: false },
  payment_reference: { type: DataTypes.STRING(80), unique: true, allowNull: true },
  verified_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  evidence_source: { type: DataTypes.STRING(20), allowNull: true },
  evidence_date: { type: DataTypes.DATEONLY, allowNull: true },
  evidence_note: { type: DataTypes.STRING(500), allowNull: true }
}, {
  tableName: 'order_status_audits',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = OrderStatusAudit;
