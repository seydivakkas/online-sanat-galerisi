const express = require('express');
const multer = require('multer');
const path = require('path');
const { Op } = require('sequelize');
const { Artwork, Artist, Category, Review, Favorite } = require('../models');
const { optionalAuth } = require('../middleware/auth');
const sequelize = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');

const router = express.Router();

// Multer konfigürasyonu — eser görselleri
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `artwork-${Date.now()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()));
  }
});

// GET /api/artworks — Tüm eserleri listele (pagination, filtre)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const offset = (page - 1) * limit;

    const where = { is_available: { [Op.ne]: false } };
    if (req.query.category_id) where.category_id = req.query.category_id;
    if (req.query.artist_id) where.artist_id = req.query.artist_id;
    if (req.query.min_price || req.query.max_price) {
      where.price = {};
      if (req.query.min_price) where.price[Op.gte] = req.query.min_price;
      if (req.query.max_price) where.price[Op.lte] = req.query.max_price;
    }
    if (req.query.search) {
      where.title = { [Op.like]: `%${req.query.search}%` };
    }

    const { count, rows } = await Artwork.findAndCountAll({
      where,
      include: [
        { model: Artist, as: 'artist', attributes: ['artist_id', 'name'] },
        { model: Category, as: 'category', attributes: ['category_id', 'name'] }
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset
    });

    sendSuccess(res, {
      artworks: rows,
      pagination: {
        total: count,
        page,
        totalPages: Math.ceil(count / limit),
        limit
      }
    });
  } catch (err) {
    sendError(res, 'Eserler listelenirken hata: ' + err.message, 500);
  }
});

// GET /api/artworks/:id — Eser detayı
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const artwork = await Artwork.findByPk(req.params.id, {
      include: [
        { model: Artist, as: 'artist' },
        { model: Category, as: 'category' },
        {
          model: Review,
          as: 'reviews',
          include: [{ model: require('../models/User'), as: 'user', attributes: ['username', 'full_name'] }],
          limit: 10,
          order: [['created_at', 'DESC']]
        }
      ]
    });

    if (!artwork) return sendError(res, 'Eser bulunamadı', 404);

    // view_count artır
    await artwork.increment('view_count');

    const avgRating = await Review.findOne({
      where: { artwork_id: req.params.id },
      attributes: [
        [sequelize.fn('AVG', sequelize.col('rating')), 'avg_rating'],
        [sequelize.fn('COUNT', sequelize.col('review_id')), 'review_count']
      ],
      raw: true
    });

    sendSuccess(res, {
      ...artwork.toJSON(),
      avg_rating: avgRating?.avg_rating ? parseFloat(avgRating.avg_rating).toFixed(1) : null,
      review_count: avgRating?.review_count || 0
    });
  } catch (err) {
    sendError(res, 'Eser detayı alınırken hata: ' + err.message, 500);
  }
});

// GET /api/artworks/:id/image — Eser görselini döndür
router.get('/:id/image', async (req, res) => {
  try {
    const artwork = await Artwork.findByPk(req.params.id, { attributes: ['image_url'] });
    if (!artwork || !artwork.image_url) {
      return sendError(res, 'Görsel bulunamadı', 404);
    }
    const imagePath = path.join(__dirname, '..', artwork.image_url);
    res.sendFile(imagePath);
  } catch (err) {
    sendError(res, 'Görsel alınırken hata', 500);
  }
});

// GET /api/artworks/:id/reviews — Eser yorumları
router.get('/:id/reviews', async (req, res) => {
  try {
    const reviews = await Review.findAll({
      where: { artwork_id: req.params.id },
      include: [
        { model: require('../models/User'), as: 'user', attributes: ['username', 'full_name'] }
      ],
      order: [['created_at', 'DESC']]
    });
    sendSuccess(res, reviews);
  } catch (err) {
    sendError(res, 'Yorumlar alınırken hata', 500);
  }
});

// GET /api/artworks/:id/avg-rating — Ortalama puan
router.get('/:id/avg-rating', async (req, res) => {
  try {
    const result = await Review.findOne({
      where: { artwork_id: req.params.id },
      attributes: [
        [sequelize.fn('AVG', sequelize.col('rating')), 'avg_rating'],
        [sequelize.fn('COUNT', sequelize.col('review_id')), 'review_count']
      ],
      raw: true
    });
    sendSuccess(res, {
      avg_rating: result?.avg_rating ? parseFloat(result.avg_rating).toFixed(1) : null,
      review_count: result?.review_count || 0
    });
  } catch (err) {
    sendError(res, 'Puan bilgisi alınırken hata', 500);
  }
});

// POST /api/artworks — Eser oluştur (admin)
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { title, description, artist_id, category_id, price, stock_quantity } = req.body;
    const image_url = req.file ? `uploads/${req.file.filename}` : null;

    const artwork = await Artwork.create({
      title, description, artist_id, category_id, price,
      stock_quantity: stock_quantity || 1,
      image_url
    });

    sendSuccess(res, artwork, 'Eser oluşturuldu', 201);
  } catch (err) {
    sendError(res, 'Eser oluşturulurken hata: ' + err.message, 500);
  }
});

module.exports = router;
