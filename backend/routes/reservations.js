const express = require('express');
const { Op } = require('sequelize');
const { Reservation, Event } = require('../models');
const sequelize = require('../config/database');
const { count, validEventSlot, reserveEvent, releaseEvent } = require('../services/inventory');
const { requireAuth } = require('../middleware/auth');
const { reservationRules } = require('../middleware/validate');
const { sendSuccess, sendError } = require('../utils/response');

const router = express.Router();

// POST /api/reservations — Rezervasyon oluştur
// ┌─ SQL Karşılığı ───────────────────────────────────────────────────────┐
// │ -- 1. Kapasite kontrolü                                                │
// │ SELECT capacity, current_registrations FROM events                     │
// │   WHERE event_id = ? AND is_active = 1                                │
// │                                                                       │
// │ -- 2. Çakışma kontrolü (UNIQUE iş mantığı)                             │
// │ SELECT * FROM reservations                                            │
// │   WHERE user_id = ? AND event_id = ? AND status != 'cancelled'        │
// │                                                                       │
// │ -- 3. Rezervasyon oluştur                                              │
// │ INSERT INTO reservations (user_id, event_id, participant_count,       │
// │   reservation_date, reservation_time, status)                         │
// │   VALUES (?, ?, ?, ?, ?, 'pending')                                   │
// │                                                                       │
// │ -- 4. Kontenjanı güncelle (denormalize alan)                           │
// │ UPDATE events SET current_registrations = current_registrations + ?   │
// │   WHERE event_id = ?                                                  │
// └───────────────────────────────────────────────────────────────────────┘
// Direct booking is only for free events; paid events must flow through an
// order hold and bank verification, otherwise payment can be bypassed.
router.post('/', requireAuth, reservationRules, async (req, res) => {
  const { event_id, participant_count, reservation_date, reservation_time } = req.body;
  try {
    const booking = await sequelize.transaction(async transaction => {
      const event = await Event.findByPk(event_id, { transaction });
      if (!event) throw Object.assign(new Error('Etkinlik bulunamadı'), { statusCode: 404 });
      if (Number(event.price || 0) !== 0) {
        throw Object.assign(new Error('Ücretli etkinlik için sipariş üzerinden ödeme talebi oluşturulmalı'), { statusCode: 409 });
      }
      validEventSlot(event, reservation_date, reservation_time);
      await reserveEvent(event, participant_count, transaction);
      // Event capacity UPDATE serializes concurrent writers before this check.
      const existing = await Reservation.findOne({ where: {
        user_id: req.user.id, event_id, status: { [Op.ne]: 'cancelled' }
      }, transaction });
      if (existing) throw Object.assign(new Error('Etkinlikte aktif rezervasyonunuz zaten var'), { statusCode: 409 });
      return Reservation.create({
        user_id: req.user.id, event_id, participant_count: Number(participant_count),
        reservation_date: event.event_date, reservation_time: event.event_time,
        status: 'confirmed'
      }, { transaction });
    });
    return sendSuccess(res, { reservation: booking }, 'Ücretsiz etkinlik kaydı onaylandı', 201);
  } catch (err) {
    if (err.statusCode) return sendError(res, err.message, err.statusCode);
    console.error('Rezervasyon oluşturma hatası:', err);
    return sendError(res, 'Rezervasyon oluşturulamadı', 500);
  }
});

// GET /api/reservations — Kullanıcının rezervasyonları
// ┌─ SQL Karşılığı ───────────────────────────────────────────────────────┐
// │ SELECT r.*, e.*                                                       │
// │ FROM reservations r                                                   │
// │ INNER JOIN events e ON r.event_id = e.event_id                        │
// │ WHERE r.user_id = ?                                                   │
// │ ORDER BY r.created_at DESC                                            │
// └───────────────────────────────────────────────────────────────────────┘
router.get('/', requireAuth, async (req, res) => {
  try {
    const reservations = await Reservation.findAll({
      where: { user_id: req.user.id },
      include: [{ model: Event, as: 'event' }],
      order: [['created_at', 'DESC']]
    });
    sendSuccess(res, reservations);
  } catch (err) {
    sendError(res, 'Rezervasyonlar listelenirken hata', 500);
  }
});

// GET /api/reservations/:id — Rezervasyon detayı
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const reservation = await Reservation.findOne({
      where: { reservation_id: req.params.id, user_id: req.user.id },
      include: [{ model: Event, as: 'event' }]
    });
    if (!reservation) return sendError(res, 'Rezervasyon bulunamadı', 404);
    sendSuccess(res, reservation);
  } catch (err) {
    sendError(res, 'Rezervasyon detayı alınırken hata', 500);
  }
});

// PUT /api/reservations/:id — Güncelle
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const result = await sequelize.transaction(async transaction => {
      const reservation = await Reservation.findOne({
        where: { reservation_id: req.params.id, user_id: req.user.id }, transaction
      });
      if (!reservation) throw Object.assign(new Error('Rezervasyon bulunamadı'), { statusCode: 404 });
      if (reservation.order_id) throw Object.assign(new Error('Siparişe bağlı rezervasyon yalnızca sipariş üzerinden yönetilebilir'), { statusCode: 409 });
      if (reservation.status !== 'confirmed') throw Object.assign(new Error('Aktif olmayan rezervasyon güncellenemez'), { statusCode: 409 });
      const event = await Event.findByPk(reservation.event_id, { transaction });
      if (!event) throw Object.assign(new Error('Etkinlik bulunamadı'), { statusCode: 404 });
      validEventSlot(event,
        req.body.reservation_date || reservation.reservation_date,
        req.body.reservation_time || reservation.reservation_time);
      const nextCount = req.body.participant_count === undefined
        ? reservation.participant_count : count(req.body.participant_count);
      const diff = nextCount - reservation.participant_count;
      if (diff > 0) await reserveEvent(event, diff, transaction);
      else if (diff < 0) await releaseEvent(event.event_id, -diff, transaction);
      const [changed] = await Reservation.update({ participant_count: nextCount }, {
        where: { reservation_id: reservation.reservation_id,
          status: 'confirmed', participant_count: reservation.participant_count,
          order_id: null }, transaction
      });
      if (changed !== 1) throw Object.assign(new Error('Rezervasyon eşzamanlı değiştirildi'), { statusCode: 409 });
      return Reservation.findByPk(reservation.reservation_id, { transaction });
    });
    return sendSuccess(res, { reservation: result }, 'Rezervasyon güncellendi');
  } catch (err) {
    if (err.statusCode) return sendError(res, err.message, err.statusCode);
    console.error('Rezervasyon güncelleme hatası:', err);
    return sendError(res, 'Rezervasyon güncellenemedi', 500);
  }
});

// DELETE /api/reservations/:id — İptal et
// ┌─ SQL Karşılığı ───────────────────────────────────────────────────────┐
// │ UPDATE reservations SET status = 'cancelled'                           │
// │   WHERE reservation_id = ? AND user_id = ?                            │
// │                                                                       │
// │ -- Kontenjanı geri aç (denormalize alanı güncelle)                     │
// │ UPDATE events SET current_registrations = current_registrations - ?   │
// │   WHERE event_id = ?                                                  │
// └───────────────────────────────────────────────────────────────────────┘
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await sequelize.transaction(async transaction => {
      const reservation = await Reservation.findOne({
        where: { reservation_id: req.params.id, user_id: req.user.id }, transaction
      });
      if (!reservation) throw Object.assign(new Error('Rezervasyon bulunamadı'), { statusCode: 404 });
      if (reservation.order_id) {
        throw Object.assign(new Error('Ücretli rezervasyon iptali/iadesi için sipariş sayfasını kullanın'), { statusCode: 409 });
      }
      if (reservation.status !== 'confirmed') {
        throw Object.assign(new Error('Rezervasyon zaten iptal edilmiş'), { statusCode: 409 });
      }
      const [changed] = await Reservation.update({ status: 'cancelled' }, {
        where: { reservation_id: reservation.reservation_id,
          user_id: req.user.id, order_id: null, status: 'confirmed' },
        transaction
      });
      if (changed !== 1) throw Object.assign(new Error('Rezervasyon zaten değişti'), { statusCode: 409 });
      await releaseEvent(reservation.event_id, reservation.participant_count, transaction);
    });
    return sendSuccess(res, null, 'Rezervasyon iptal edildi, yer yeniden açıldı');
  } catch (err) {
    if (err.statusCode) return sendError(res, err.message, err.statusCode);
    console.error('Rezervasyon iptal hatası:', err);
    return sendError(res, 'Rezervasyon iptal edilemedi', 500);
  }
});

module.exports = router;
