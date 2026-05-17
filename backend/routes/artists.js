const express = require('express');
const { Artist, Artwork, Category } = require('../models');
const { sendSuccess, sendError } = require('../utils/response');

const router = express.Router();

// GET /api/artists — Sanatçıları listele
router.get('/', async (req, res) => {
  try {
    const artists = await Artist.findAll({
      include: [{ model: Artwork, as: 'artworks', attributes: ['artwork_id', 'title', 'price', 'image_url'] }]
    });
    sendSuccess(res, artists);
  } catch (err) {
    sendError(res, 'Sanatçılar listelenirken hata', 500);
  }
});

// GET /api/artists/:id — Sanatçı profili ve eserleri
router.get('/:id', async (req, res) => {
  try {
    const artist = await Artist.findByPk(req.params.id, {
      include: [{
        model: Artwork,
        as: 'artworks',
        include: [{ model: Category, as: 'category', attributes: ['name'] }]
      }]
    });
    if (!artist) return sendError(res, 'Sanatçı bulunamadı', 404);
    sendSuccess(res, artist);
  } catch (err) {
    sendError(res, 'Sanatçı bilgileri alınırken hata', 500);
  }
});

// GET /api/categories — Kategorileri listele
router.get('/categories/all', async (req, res) => {
  try {
    const categories = await Category.findAll();
    sendSuccess(res, categories);
  } catch (err) {
    sendError(res, 'Kategoriler listelenirken hata', 500);
  }
});

module.exports = router;
