const express = require('express');
const { Op } = require('sequelize');
const { Event, User, Review } = require('../models');
const sequelize = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');

const router = express.Router();

// GET /api/events — Aktif etkinlikleri listele
router.get('/', async (req, res) => {
  try {
    const where = { is_active: true };

    if (req.query.filter === 'upcoming') {
      where.event_date = { [Op.gte]: new Date().toISOString().split('T')[0] };
    }
    if (req.query.search) {
      where.title = { [Op.like]: `%${req.query.search}%` };
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const offset = (page - 1) * limit;

    const { count, rows } = await Event.findAndCountAll({
      where,
      include: [{ model: User, as: 'organizer', attributes: ['username', 'full_name'] }],
      order: [['event_date', 'ASC']],
      limit,
      offset
    });

    sendSuccess(res, {
      events: rows,
      pagination: { total: count, page, totalPages: Math.ceil(count / limit), limit }
    });
  } catch (err) {
    sendError(res, 'Etkinlikler listelenirken hata: ' + err.message, 500);
  }
});

// GET /api/events/:id — Etkinlik detayı
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id, {
      include: [
        { model: User, as: 'organizer', attributes: ['username', 'full_name'] },
        {
          model: Review,
          as: 'reviews',
          include: [{ model: User, as: 'user', attributes: ['username', 'full_name'] }],
          limit: 10,
          order: [['created_at', 'DESC']]
        }
      ]
    });
    if (!event) return sendError(res, 'Etkinlik bulunamadı', 404);

    const avgRating = await Review.findOne({
      where: { event_id: req.params.id },
      attributes: [
        [sequelize.fn('AVG', sequelize.col('rating')), 'avg_rating'],
        [sequelize.fn('COUNT', sequelize.col('review_id')), 'review_count']
      ],
      raw: true
    });

    sendSuccess(res, {
      ...event.toJSON(),
      avg_rating: avgRating?.avg_rating ? parseFloat(avgRating.avg_rating).toFixed(1) : null,
      review_count: avgRating?.review_count || 0,
      remaining_spots: event.capacity - event.current_registrations
    });
  } catch (err) {
    sendError(res, 'Etkinlik detayı alınırken hata: ' + err.message, 500);
  }
});

module.exports = router;
