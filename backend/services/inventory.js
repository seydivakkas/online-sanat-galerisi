const { Op } = require('sequelize');
const { Artwork, Event } = require('../models');
const sequelize = require('../config/database');

// Atomic updates are the final stock/capacity arbitration point for both
// SQLite and PostgreSQL. Plain SELECT+increment is NOT a capacity lock.
class InventoryConflict extends Error {
  constructor(message, statusCode = 409) {
    super(message);
    this.statusCode = statusCode;
  }
}

function count(value) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1 || String(n) !== String(value)) {
    throw new InventoryConflict('Adet pozitif bir tam sayı olmalı', 400);
  }
  return n;
}

function validEventSlot(event, date, time) {
  if (typeof date !== 'string' || typeof time !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    throw new InventoryConflict('Tarih ve saat YYYY-MM-DD / HH:MM biçiminde olmalı', 400);
  }
  if (date !== event.event_date || time !== event.event_time) {
    throw new InventoryConflict('Rezervasyon tarihi ve saati etkinliğin ilan edilen oturumuyla aynı olmalı');
  }
  // v1 events have one fixed session, in the gallery's Europe/Istanbul zone.
  const scheduled = Date.parse(date + 'T' + time + ':00+03:00');
  if (!Number.isFinite(scheduled) || scheduled <= Date.now()) {
    throw new InventoryConflict('Geçmiş bir etkinliğe rezervasyon yapılamaz');
  }
}

async function reserveArtwork(id, value, transaction) {
  const quantity = count(value);
  const [updated] = await Artwork.update({
    stock_quantity: sequelize.literal('stock_quantity - ' + quantity)
  }, {
    where: { artwork_id: id, is_available: true,
      stock_quantity: { [Op.gte]: quantity } }, transaction
  });
  if (updated !== 1) throw new InventoryConflict('Eser stoğu yetersiz veya eser satışta değil');
}

async function releaseArtwork(id, value, transaction) {
  const quantity = count(value);
  const [updated] = await Artwork.update({
    stock_quantity: sequelize.literal('stock_quantity + ' + quantity)
  }, { where: { artwork_id: id }, transaction });
  if (updated !== 1) throw new InventoryConflict('İade edilecek eser kaydı bulunamadı');
}

async function reserveEvent(event, value, transaction) {
  const quantity = count(value);
  const [updated] = await Event.update({
    current_registrations: sequelize.literal('current_registrations + ' + quantity)
  }, {
    where: { event_id: event.event_id, is_active: true,
      current_registrations: { [Op.lte]: sequelize.literal('capacity - ' + quantity) } },
    transaction
  });
  if (updated !== 1) throw new InventoryConflict('Etkinlik kontenjanı dolu veya etkinlik pasif');
}

async function releaseEvent(id, value, transaction) {
  const quantity = count(value);
  const [updated] = await Event.update({
    current_registrations: sequelize.literal('current_registrations - ' + quantity)
  }, {
    where: { event_id: id, current_registrations: { [Op.gte]: quantity } },
    transaction
  });
  if (updated !== 1) throw new InventoryConflict('Etkinlik kontenjanı tutarsız; işlem geri alındı');
}

module.exports = { InventoryConflict, count, validEventSlot,
  reserveArtwork, releaseArtwork, reserveEvent, releaseEvent };
