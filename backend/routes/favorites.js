const express = require('express');
const { Favorite, Artwork, Artist, Category } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { sendSuccess, sendError } = require('../utils/response');

const router = express.Router();

// POST /api/favorites — Favoriye ekle
// ┌─ SQL Karşılığı (UNIQUE kontrol + INSERT) ───────────────────────────┐
// │ -- 1. Çift favori kontrolü (UNIQUE(user_id, artwork_id))               │
// │ SELECT * FROM favorites WHERE user_id = ? AND artwork_id = ?          │
// │   -- Eğer varsa: 409 Conflict dön                                     │
// │                                                                       │
// │ -- 2. Favoriye ekle                                                   │
// │ INSERT INTO favorites (user_id, artwork_id) VALUES (?, ?)             │
// └───────────────────────────────────────────────────────────────────────┘
router.post('/', requireAuth, async (req, res) => {
  try {
    const { artwork_id } = req.body;
    if (!artwork_id) return sendError(res, 'artwork_id gerekli', 400);

    const artwork = await Artwork.findByPk(artwork_id);
    if (!artwork) return sendError(res, 'Eser bulunamadı', 404);

    const exists = await Favorite.findOne({
      where: { user_id: req.user.id, artwork_id }
    });
    if (exists) return sendError(res, 'Bu eser zaten favorilerinizde', 409);

    const favorite = await Favorite.create({ user_id: req.user.id, artwork_id });
    sendSuccess(res, { favorite }, 'Favorilere eklendi', 201);
  } catch (err) {
    sendError(res, 'Favoriye eklerken hata: ' + err.message, 500);
  }
});

// GET /api/favorites — Favori listesi
// ┌─ SQL Karşılığı (3 Tablo JOIN) ─────────────────────────────────────┐
// │ SELECT f.*, a.*, ar.name AS sanatci, c.name AS kategori              │
// │ FROM favorites f                                                      │
// │ INNER JOIN artworks a ON f.artwork_id = a.artwork_id                  │
// │ LEFT JOIN artists ar ON a.artist_id = ar.artist_id                    │
// │ LEFT JOIN categories c ON a.category_id = c.category_id              │
// │ WHERE f.user_id = ?                                                   │
// │ ORDER BY f.added_at DESC                                              │
// └───────────────────────────────────────────────────────────────────────┘
router.get('/', requireAuth, async (req, res) => {
  try {
    const favorites = await Favorite.findAll({
      where: { user_id: req.user.id },
      include: [{
        model: Artwork,
        as: 'artwork',
        include: [
          { model: Artist, as: 'artist', attributes: ['name'] },
          { model: Category, as: 'category', attributes: ['name'] }
        ]
      }],
      order: [['added_at', 'DESC']]
    });
    sendSuccess(res, favorites);
  } catch (err) {
    sendError(res, 'Favoriler listelenirken hata', 500);
  }
});

// DELETE /api/favorites/:artwork_id — Favoriden çıkar
// ┌─ SQL Karşılığı ───────────────────────────────────────────────────────┐
// │ DELETE FROM favorites WHERE user_id = ? AND artwork_id = ?            │
// └───────────────────────────────────────────────────────────────────────┘
router.delete('/:artwork_id', requireAuth, async (req, res) => {
  try {
    const deleted = await Favorite.destroy({
      where: { user_id: req.user.id, artwork_id: req.params.artwork_id }
    });
    if (!deleted) return sendError(res, 'Favoride bu eser bulunamadı', 404);
    sendSuccess(res, null, 'Favorilerden çıkarıldı');
  } catch (err) {
    sendError(res, 'Favoriden çıkarırken hata', 500);
  }
});

module.exports = router;
