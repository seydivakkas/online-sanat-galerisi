const express = require('express');
const multer = require('multer');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const { Op } = require('sequelize');
const { Artwork, Artist, Category, Review, Favorite } = require('../models');
const { optionalAuth, requireAuth, requireRole } = require('../middleware/auth');
const sequelize = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');

const router = express.Router();

// Images are untrusted inputs. Restrict extensions, declared MIME types,
// upload size and file signatures before accepting a file into the catalogue.
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const IMAGE_TYPES = Object.freeze({
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp'
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, 'artwork-' + crypto.randomUUID() + ext);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
    fields: 10,
    parts: 11,
    fieldSize: 16 * 1024
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!IMAGE_TYPES[ext] || file.mimetype !== IMAGE_TYPES[ext]) {
      return cb(new Error('Yalnızca JPEG, PNG, GIF veya WebP görselleri yüklenebilir'));
    }
    cb(null, true);
  }
});

function validImageSignature(header, ext, bytesRead) {
  if (ext === '.jpg' || ext === '.jpeg') {
    return bytesRead >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  }
  if (ext === '.png') {
    return bytesRead >= 8 && header.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'));
  }
  if (ext === '.gif') {
    return bytesRead >= 6 && ['GIF87a', 'GIF89a'].includes(header.toString('ascii', 0, 6));
  }
  if (ext === '.webp') {
    return bytesRead >= 12 && header.toString('ascii', 0, 4) === 'RIFF' &&
      header.toString('ascii', 8, 12) === 'WEBP';
  }
  return false;
}

async function inspectUploadedImage(file) {
  const handle = await fs.promises.open(file.path, 'r');
  try {
    const header = Buffer.alloc(12);
    const { bytesRead } = await handle.read(header, 0, header.length, 0);
    return validImageSignature(header, path.extname(file.filename), bytesRead);
  } finally {
    await handle.close();
  }
}

async function removeUpload(file) {
  if (file) await fs.promises.unlink(file.path).catch(() => {});
}

// Convert Multer failures to user-safe 400 responses. Authentication and role
// checks run before this middleware, preventing unauthorized disk writes.
function receiveImage(req, res, next) {
  upload.single('image')(req, res, err => {
    if (err) return sendError(res, err.code === 'LIMIT_FILE_SIZE'
      ? 'Görsel en fazla 5 MB olabilir'
      : 'Geçersiz görsel yükleme isteği', 400);
    next();
  });
}

// GET /api/artworks — Tüm eserleri listele (pagination, filtre)
// ┌─ SQL Karşılığı ───────────────────────────────────────────────────────┐
// │ SELECT a.*, ar.artist_id, ar.name, c.category_id, c.name             │
// │ FROM artworks a                                                       │
// │ LEFT JOIN artists ar ON a.artist_id = ar.artist_id                    │
// │ LEFT JOIN categories c ON a.category_id = c.category_id              │
// │ WHERE a.is_available != false                                         │
// │   AND a.category_id = ?           -- (opsiyonel filtre)               │
// │   AND a.price BETWEEN ? AND ?     -- (opsiyonel fiyat aralığı)       │
// │   AND a.title LIKE '%?%'          -- (opsiyonel arama)               │
// │ ORDER BY a.created_at DESC                                            │
// │ LIMIT ? OFFSET ?                  -- (sayfalama)                     │
// └───────────────────────────────────────────────────────────────────────┘
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
// ┌─ SQL Karşılığı ───────────────────────────────────────────────────────┐
// │ SELECT a.*, ar.*, c.*                                                 │
// │ FROM artworks a                                                       │
// │ LEFT JOIN artists ar ON a.artist_id = ar.artist_id                    │
// │ LEFT JOIN categories c ON a.category_id = c.category_id              │
// │ LEFT JOIN reviews r ON a.artwork_id = r.artwork_id                    │
// │ LEFT JOIN users u ON r.user_id = u.user_id                            │
// │ WHERE a.artwork_id = ?                                                │
// │                                                                       │
// │ -- Ayrıca: Ortalama puan hesaplama (Aggregate Subquery)               │
// │ SELECT AVG(rating) AS avg_rating, COUNT(review_id) AS review_count    │
// │ FROM reviews WHERE artwork_id = ?                                     │
// │                                                                       │
// │ -- Ayrıca: Görüntülenme sayısını artır                                │
// │ UPDATE artworks SET view_count = view_count + 1 WHERE artwork_id = ?  │
// └───────────────────────────────────────────────────────────────────────┘
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
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.sendFile(imagePath);
  } catch (err) {
    sendError(res, 'Görsel alınırken hata', 500);
  }
});

// GET /api/artworks/:id/reviews — Eser yorumları
// ┌─ SQL Karşılığı ───────────────────────────────────────────────────────┐
// │ SELECT r.*, u.username, u.full_name                                   │
// │ FROM reviews r                                                        │
// │ INNER JOIN users u ON r.user_id = u.user_id                           │
// │ WHERE r.artwork_id = ?                                                │
// │ ORDER BY r.created_at DESC                                            │
// └───────────────────────────────────────────────────────────────────────┘
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
// ┌─ SQL Karşılığı ───────────────────────────────────────────────────────┐
// │ SELECT AVG(rating) AS avg_rating, COUNT(review_id) AS review_count    │
// │ FROM reviews                                                          │
// │ WHERE artwork_id = ?                                                  │
// └───────────────────────────────────────────────────────────────────────┘
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

// POST /api/artworks — only an active admin/manager may upload art.
router.post('/', requireAuth, requireRole('admin', 'gallery_manager'), receiveImage, async (req, res) => {
  try {
    if (req.file && !(await inspectUploadedImage(req.file))) {
      await removeUpload(req.file);
      return sendError(res, 'Dosya içeriği geçerli bir görsel formatı değil', 400);
    }

    const { title, description, artist_id, category_id, price, stock_quantity } = req.body;
    const qty = Number(stock_quantity === undefined ? 1 : stock_quantity);
    const amount = Number(price);
    if (typeof title !== 'string' || !title.trim() || title.trim().length > 150 ||
      !Number.isFinite(amount) || amount < 0 || !/^\\d+(?:\\.\\d{1,2})?$/.test(String(price)) ||
      !Number.isSafeInteger(qty) || qty < 0 ||
      !Number.isSafeInteger(Number(artist_id)) || Number(artist_id) < 1 ||
      !Number.isSafeInteger(Number(category_id)) || Number(category_id) < 1) {
      await removeUpload(req.file);
      return sendError(res, 'Başlık, sanatçı, kategori, fiyat veya stok alanı geçersiz', 400);
    }
    const [artist, category] = await Promise.all([
      Artist.findByPk(artist_id), Category.findByPk(category_id)
    ]);
    if (!artist || !artist.is_active || !category) {
      await removeUpload(req.file);
      return sendError(res, 'Geçerli ve aktif sanatçı ile kategori seçilmeli', 400);
    }
    const image_url = req.file ? 'uploads/' + req.file.filename : null;

    const artwork = await Artwork.create({
      title: title.trim(), description, artist_id, category_id, price,
      stock_quantity: qty,
      image_url
    });

    return sendSuccess(res, artwork, 'Eser oluşturuldu', 201);
  } catch (err) {
    await removeUpload(req.file);
    return sendError(res, 'Eser oluşturulurken hata oluştu', 500);
  }
});

module.exports = router;
