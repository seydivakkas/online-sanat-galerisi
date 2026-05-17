const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Artist = sequelize.define('Artist', {
  artist_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  bio: {
    type: DataTypes.TEXT
  },
  profile_image_url: {
    type: DataTypes.STRING(255)
  },
  contact: {
    type: DataTypes.STRING(100)
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  website: {
    type: DataTypes.STRING(255)
  }
}, {
  tableName: 'artists',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = Artist;
