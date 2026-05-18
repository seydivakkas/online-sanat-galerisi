const express = require('express');
const { Op } = require('sequelize');
const { Reservation, Event, User } = require('../models');
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
router.post('/', requireAuth, reservationRules, async (req, res) => {
  try {
    const { event_id, participant_count, reservation_date, reservation_time } = req.body;

    const event = await Event.findByPk(event_id);
    if (!event) return sendError(res, 'Etkinlik bulunamadı', 404);
    if (!event.is_active) return sendError(res, 'Bu etkinlik artık aktif değil', 400);

    // Kapasite kontrolü
    const remaining = event.capacity - event.current_registrations;
    if (remaining < participant_count) {
      return sendError(res, `Yetersiz kontenjan. Kalan: ${remaining}, İstenen: ${participant_count}`, 409);
    }

    // Çakışma kontrolü
    const existing = await Reservation.findOne({
      where: {
        user_id: req.user.id,
        event_id,
        status: { [Op.ne]: 'cancelled' }
      }
    });
    if (existing) {
      return sendError(res, 'Bu etkinliğe zaten aktif bir rezervasyonunuz var', 409);
    }

    const reservation = await Reservation.create({
      user_id: req.user.id,
      event_id,
      participant_count,
      reservation_date,
      reservation_time,
      status: 'pending'
    });

    // current_registrations güncelle
    await event.increment('current_registrations', { by: participant_count });

    sendSuccess(res, { reservation }, 'Rezervasyon oluşturuldu', 201);
  } catch (err) {
    sendError(res, 'Rezervasyon oluşturulurken hata: ' + err.message, 500);
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
    const reservation = await Reservation.findOne({
      where: { reservation_id: req.params.id, user_id: req.user.id }
    });
    if (!reservation) return sendError(res, 'Rezervasyon bulunamadı', 404);
    if (reservation.status === 'cancelled') {
      return sendError(res, 'İptal edilmiş rezervasyon güncellenemez', 400);
    }

    const { participant_count, reservation_date, reservation_time } = req.body;

    if (participant_count && participant_count !== reservation.participant_count) {
      const event = await Event.findByPk(reservation.event_id);
      const diff = participant_count - reservation.participant_count;
      const remaining = event.capacity - event.current_registrations;
      if (diff > 0 && remaining < diff) {
        return sendError(res, `Yetersiz kontenjan. Eklenebilecek: ${remaining}`, 409);
      }
      await event.increment('current_registrations', { by: diff });
      reservation.participant_count = participant_count;
    }

    if (reservation_date) reservation.reservation_date = reservation_date;
    if (reservation_time) reservation.reservation_time = reservation_time;
    await reservation.save();

    sendSuccess(res, { reservation }, 'Rezervasyon güncellendi');
  } catch (err) {
    sendError(res, 'Rezervasyon güncellenirken hata: ' + err.message, 500);
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
    const reservation = await Reservation.findOne({
      where: { reservation_id: req.params.id, user_id: req.user.id }
    });
    if (!reservation) return sendError(res, 'Rezervasyon bulunamadı', 404);
    if (reservation.status === 'cancelled') {
      return sendError(res, 'Bu rezervasyon zaten iptal edilmiş', 400);
    }

    // current_registrations geri azalt
    const event = await Event.findByPk(reservation.event_id);
    await event.decrement('current_registrations', { by: reservation.participant_count });

    reservation.status = 'cancelled';
    await reservation.save();

    sendSuccess(res, null, 'Rezervasyon iptal edildi');
  } catch (err) {
    sendError(res, 'Rezervasyon iptal edilirken hata: ' + err.message, 500);
  }
});

module.exports = router;
