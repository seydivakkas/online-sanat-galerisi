const express = require('express');
const { Op } = require('sequelize');
const { Review, ReviewVote, ReviewReply, User, Order, OrderItem, Reservation } = require('../models');
const { requireAuth, requireRole, requirePurchase, requireAttendance } = require('../middleware/auth');
const { reviewRules } = require('../middleware/validate');
const sequelize = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');

const router = express.Router();

// POST /api/reviews — Yorum ekle (satın alma / katılım kontrolü)
// ┌─ SQL Karşılığı (İş kuralı doğrulaması + INSERT) ───────────────────────┐
// │ -- 1. Satın alma kontrolü (INNER JOIN + Subquery)                      │
// │ SELECT o.order_id FROM orders o                                       │
// │ INNER JOIN order_items oi ON o.order_id = oi.order_id                 │
// │ WHERE o.user_id = ? AND o.status IN ('paid','shipped','delivered')    │
// │   AND oi.item_type = 'artwork' AND oi.item_id = ?                    │
// │                                                                       │
// │ -- 2. Katılım kontrolü                                                 │
// │ SELECT * FROM reservations                                            │
// │   WHERE user_id = ? AND event_id = ? AND status = 'confirmed'        │
// │                                                                       │
// │ -- 3. Yorum oluştur                                                   │
// │ INSERT INTO reviews (user_id, artwork_id, event_id, rating,          │
// │   comment, is_verified) VALUES (?, ?, ?, ?, ?, 1)                     │
// └───────────────────────────────────────────────────────────────────────┘
router.post('/', requireAuth, reviewRules, async (req, res) => {
  try {
    const { artwork_id, event_id, rating, comment } = req.body;

    if (!artwork_id && !event_id) {
      return sendError(res, 'artwork_id veya event_id gerekli', 400);
    }

    // Satın alma kontrolü (artwork)
    if (artwork_id) {
      const hasPurchased = await Order.findOne({
        where: { user_id: req.user.id, status: { [Op.in]: ['paid', 'shipped', 'delivered'] } },
        include: [{ model: OrderItem, as: 'items', where: { item_type: 'artwork', item_id: artwork_id }, required: true }]
      });
      if (!hasPurchased) {
        return sendError(res, 'Bu esere yorum yapabilmek için satın almış olmanız gerekir', 403);
      }
    }

    // Katılım kontrolü (event)
    if (event_id) {
      const hasAttended = await Reservation.findOne({
        where: { user_id: req.user.id, event_id, status: 'confirmed' }
      });
      if (!hasAttended) {
        return sendError(res, 'Bu etkinliğe yorum yapabilmek için katılmış olmanız gerekir', 403);
      }
    }

    const review = await Review.create({
      user_id: req.user.id,
      artwork_id: artwork_id || null,
      event_id: event_id || null,
      rating,
      comment,
      is_verified: true
    });

    sendSuccess(res, { review }, 'Yorum eklendi', 201);
  } catch (err) {
    sendError(res, 'Yorum eklenirken hata: ' + err.message, 500);
  }
});

// GET /api/reviews — Tüm yorumlar (filtreleme + sıralama)
router.get('/', async (req, res) => {
  try {
    const where = {};
    let order = [['created_at', 'DESC']];

    if (req.query.sort === 'highest_rated') order = [['rating', 'DESC']];
    if (req.query.sort === 'newest') order = [['created_at', 'DESC']];

    const reviews = await Review.findAll({
      where,
      include: [{ model: User, as: 'user', attributes: ['username', 'full_name'] }],
      order
    });

    // most_helpful sıralama
    if (req.query.sort === 'most_helpful') {
      const reviewsWithVotes = await Promise.all(reviews.map(async (r) => {
        const helpfulCount = await ReviewVote.count({
          where: { review_id: r.review_id, is_helpful: true }
        });
        return { ...r.toJSON(), helpful_count: helpfulCount };
      }));
      reviewsWithVotes.sort((a, b) => b.helpful_count - a.helpful_count);
      return sendSuccess(res, reviewsWithVotes);
    }

    sendSuccess(res, reviews);
  } catch (err) {
    sendError(res, 'Yorumlar listelenirken hata', 500);
  }
});

// POST /api/reviews/:id/vote — Yorum oylama
// ┌─ SQL Karşılığı (UNIQUE kontrol + INSERT) ───────────────────────────┐
// │ -- 1. Çift oy kontrolü (UNIQUE constraint)                              │
// │ SELECT * FROM review_votes                                            │
// │   WHERE review_id = ? AND user_id = ?                                 │
// │   -- Eğer varsa: 409 Conflict dön                                     │
// │                                                                       │
// │ -- 2. Oy ekle                                                         │
// │ INSERT INTO review_votes (review_id, user_id, is_helpful)             │
// │   VALUES (?, ?, ?)                                                    │
// └───────────────────────────────────────────────────────────────────────┘
router.post('/:id/vote', requireAuth, async (req, res) => {
  try {
    const { is_helpful } = req.body;
    if (is_helpful === undefined) {
      return sendError(res, 'is_helpful alanı gerekli', 400);
    }

    const review = await Review.findByPk(req.params.id);
    if (!review) return sendError(res, 'Yorum bulunamadı', 404);

    const existing = await ReviewVote.findOne({
      where: { review_id: req.params.id, user_id: req.user.id }
    });
    if (existing) return sendError(res, 'Bu yorumu zaten oyladınız', 409);

    const vote = await ReviewVote.create({
      review_id: parseInt(req.params.id),
      user_id: req.user.id,
      is_helpful
    });

    sendSuccess(res, { vote }, 'Oy kaydedildi', 201);
  } catch (err) {
    sendError(res, 'Oy verilirken hata: ' + err.message, 500);
  }
});

// POST /api/reviews/:id/replies — Yanıt ver (admin/manager)
router.post('/:id/replies', requireAuth, requireRole('admin', 'gallery_manager'), async (req, res) => {
  try {
    const { reply_text } = req.body;
    if (!reply_text) return sendError(res, 'reply_text gerekli', 400);

    const review = await Review.findByPk(req.params.id);
    if (!review) return sendError(res, 'Yorum bulunamadı', 404);

    const reply = await ReviewReply.create({
      review_id: parseInt(req.params.id),
      replier_id: req.user.id,
      reply_text
    });

    sendSuccess(res, { reply }, 'Yanıt eklendi', 201);
  } catch (err) {
    sendError(res, 'Yanıt eklenirken hata: ' + err.message, 500);
  }
});

// GET /api/reviews/:id/replies — Yanıtları görüntüle
router.get('/:id/replies', async (req, res) => {
  try {
    const replies = await ReviewReply.findAll({
      where: { review_id: req.params.id },
      include: [{ model: User, as: 'replier', attributes: ['username', 'full_name', 'role'] }],
      order: [['created_at', 'ASC']]
    });
    sendSuccess(res, replies);
  } catch (err) {
    sendError(res, 'Yanıtlar alınırken hata', 500);
  }
});

// PATCH /api/reviews/:id/status — Yorum onay/ret (Admin/Manager)
router.patch('/:id/status', requireAuth, requireRole('admin', 'gallery_manager'), async (req, res) => {
  try {
    const { is_verified } = req.body;
    if (typeof is_verified !== 'boolean') {
      return sendError(res, 'is_verified alanı boolean olmalıdır', 400);
    }

    const review = await Review.findByPk(req.params.id);
    if (!review) return sendError(res, 'Yorum bulunamadı', 404);

    review.is_verified = is_verified;
    await review.save();

    sendSuccess(res, { review }, `Yorum ${is_verified ? 'onaylandı' : 'reddedildi'}`);
  } catch (err) {
    sendError(res, 'Yorum durumu güncellenirken hata: ' + err.message, 500);
  }
});

module.exports = router;
