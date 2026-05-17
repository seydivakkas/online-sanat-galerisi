const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Comparison = sequelize.define('Comparison', {
  comparison_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'user_id' }
  },
  comparison_type: {
    type: DataTypes.ENUM('artwork', 'event'),
    allowNull: false
  },
  item_ids: {
    type: DataTypes.TEXT,
    allowNull: false,
    get() {
      const raw = this.getDataValue('item_ids');
      return raw ? JSON.parse(raw) : [];
    },
    set(val) {
      this.setDataValue('item_ids', JSON.stringify(val));
    }
  },
  saved_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'comparisons',
  timestamps: false
});

module.exports = Comparison;
