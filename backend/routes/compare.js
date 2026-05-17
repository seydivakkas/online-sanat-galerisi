const express = require('express');
const { Artwork, Event, Artist, Category, Review, Comparison } = require('../models');
const { requireAuth } = require('../middleware/auth');
const sequelize = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');

const router = express.Router();

// POST /api/compare/artworks — Eser karşılaştırma
router.post('/artworks', async (req, res) => {
  try {
    const { artwork_ids } = req.body;
    if (!artwork_ids || artwork_ids.length < 2) {
      return sendError(res, 'En az 2 eser ID\'si gerekli', 400);
    }

    const artworks = await Artwork.findAll({
      where: { artwork_id: artwork_ids },
      include: [
        { model: Artist, as: 'artist', attributes: ['name'] },
        { model: Category, as: 'category', attributes: ['name'] }
      ]
    });

    const comparison = await Promise.all(artworks.map(async (a) => {
      const avgRating = await Review.findOne({
        where: { artwork_id: a.artwork_id },
        attributes: [
          [sequelize.fn('AVG', sequelize.col('rating')), 'avg_rating'],
          [sequelize.fn('COUNT', sequelize.col('review_id')), 'review_count']
        ],
        raw: true
      });

      return {
        artwork_id: a.artwork_id,
        title: a.title,
        artist: a.artist?.name,
        category: a.category?.name,
        price: a.price,
        stock_quantity: a.stock_quantity,
        view_count: a.view_count,
        avg_rating: avgRating?.avg_rating ? parseFloat(avgRating.avg_rating).toFixed(1) : null,
        review_count: avgRating?.review_count || 0,
        image_url: a.image_url
      };
    }));

    sendSuccess(res, { comparison });
  } catch (err) {
    sendError(res, 'Karşılaştırma yapılırken hata: ' + err.message, 500);
  }
});

// POST /api/compare/events — Etkinlik karşılaştırma
router.post('/events', async (req, res) => {
  try {
    const { event_ids } = req.body;
    if (!event_ids || event_ids.length < 2) {
      return sendError(res, 'En az 2 etkinlik ID\'si gerekli', 400);
    }

    const events = await Event.findAll({ where: { event_id: event_ids } });

    const comparison = await Promise.all(events.map(async (e) => {
      const avgRating = await Review.findOne({
        where: { event_id: e.event_id },
        attributes: [
          [sequelize.fn('AVG', sequelize.col('rating')), 'avg_rating'],
          [sequelize.fn('COUNT', sequelize.col('review_id')), 'review_count']
        ],
        raw: true
      });

      return {
        event_id: e.event_id,
        title: e.title,
        event_date: e.event_date,
        event_time: e.event_time,
        duration_minutes: e.duration_minutes,
        price: e.price,
        capacity: e.capacity,
        current_registrations: e.current_registrations,
        occupancy_rate: e.capacity > 0
          ? ((e.current_registrations / e.capacity) * 100).toFixed(1) + '%'
          : '0%',
        location: e.location,
        avg_rating: avgRating?.avg_rating ? parseFloat(avgRating.avg_rating).toFixed(1) : null,
        review_count: avgRating?.review_count || 0
      };
    }));

    sendSuccess(res, { comparison });
  } catch (err) {
    sendError(res, 'Karşılaştırma yapılırken hata: ' + err.message, 500);
  }
});

// POST /api/compare/save — Karşılaştırmayı kaydet
router.post('/save', requireAuth, async (req, res) => {
  try {
    const { comparison_type, item_ids } = req.body;
    if (!comparison_type || !item_ids || !item_ids.length) {
      return sendError(res, 'comparison_type ve item_ids gerekli', 400);
    }

    const comp = await Comparison.create({
      user_id: req.user.id,
      comparison_type,
      item_ids
    });

    sendSuccess(res, { comparison: comp }, 'Karşılaştırma kaydedildi', 201);
  } catch (err) {
    sendError(res, 'Karşılaştırma kaydedilirken hata: ' + err.message, 500);
  }
});

// GET /api/compare/saved — Kaydedilen karşılaştırmalar
router.get('/saved', requireAuth, async (req, res) => {
  try {
    const comparisons = await Comparison.findAll({
      where: { user_id: req.user.id },
      order: [['saved_at', 'DESC']]
    });
    sendSuccess(res, comparisons);
  } catch (err) {
    sendError(res, 'Karşılaştırmalar listelenirken hata', 500);
  }
});

module.exports = router;
