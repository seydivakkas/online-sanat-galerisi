const express = require('express');
const { User, Artwork, Artist, Category, Event, Order, OrderItem, Reservation, Review, ReviewReply, Favorite, Coupon, SupportTicket, SupportMessage } = require('../models');
const { requireAuth, requireRole } = require('../middleware/auth');
const sequelize = require('../config/database');
const { Op } = require('sequelize');
const { sendSuccess, sendError } = require('../utils/response');

const router = express.Router();

// Tüm admin/manager rotaları için auth zorunlu
router.use(requireAuth);

// ════════════════════════════════════════
//  DASHBOARD & RAPORLAR (admin + manager)
// ════════════════════════════════════════

// GET /api/admin/reports/summary
router.get('/reports/summary', requireRole('admin', 'gallery_manager'), async (req, res) => {
  try {
    const totalUsers = await User.count();
    const totalArtworks = await Artwork.count();
    const totalEvents = await Event.count();
    const totalOrders = await Order.count();
    const totalReservations = await Reservation.count();

    const monthlyRevenue = await Order.sum('total_amount', {
      where: { status: { [Op.in]: ['paid', 'shipped', 'delivered'] } }
    });

    const topArtworks = await Favorite.findAll({
      attributes: ['artwork_id', [sequelize.fn('COUNT', sequelize.col('favorite_id')), 'like_count']],
      group: ['artwork_id'],
      order: [[sequelize.fn('COUNT', sequelize.col('favorite_id')), 'DESC']],
      limit: 5, raw: true
    });
    const topArtworkDetails = await Promise.all(
      topArtworks.map(async (f) => {
        const artwork = await Artwork.findByPk(f.artwork_id, { attributes: ['title', 'image_url'] });
        return { ...f, title: artwork?.title, image_url: artwork?.image_url };
      })
    );

    const topEvents = await Event.findAll({
      order: [[sequelize.literal('CAST(current_registrations AS FLOAT) / CAST(capacity AS FLOAT)'), 'DESC']],
      limit: 5,
      attributes: ['event_id', 'title', 'capacity', 'current_registrations', 'event_date']
    });

    sendSuccess(res, { totalUsers, totalArtworks, totalEvents, totalOrders, totalReservations, monthlyRevenue: monthlyRevenue || 0, topArtworks: topArtworkDetails, topEvents });
  } catch (err) {
    sendError(res, 'Özet rapor hatası: ' + err.message, 500);
  }
});

// GET /api/admin/reports/artworks
router.get('/reports/artworks', requireRole('admin', 'gallery_manager'), async (req, res) => {
  try {
    const artworks = await Artwork.findAll({
      attributes: [
        'artwork_id', 'title', 'price', 'view_count', 'stock_quantity', 'image_url',
        [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('reviews.review_id'))), 'review_count'],
        [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('favorites.favorite_id'))), 'like_count'],
        [sequelize.fn('AVG', sequelize.col('reviews.rating')), 'avg_rating']
      ],
      include: [
        { model: Review, as: 'reviews', attributes: [], duplicating: false },
        { model: Favorite, as: 'favorites', attributes: [], duplicating: false }
      ],
      group: ['Artwork.artwork_id'], raw: true, subQuery: false
    });
    sendSuccess(res, artworks.map(a => ({ ...a, avg_rating: a.avg_rating ? parseFloat(a.avg_rating).toFixed(1) : null })));
  } catch (err) {
    sendError(res, 'Eser raporu hatası: ' + err.message, 500);
  }
});

// GET /api/admin/reports/events
router.get('/reports/events', requireRole('admin', 'gallery_manager'), async (req, res) => {
  try {
    const events = await Event.findAll({
      attributes: [
        'event_id', 'title', 'capacity', 'current_registrations', 'event_date', 'price',
        [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('reviews.review_id'))), 'review_count'],
        [sequelize.fn('AVG', sequelize.col('reviews.rating')), 'avg_rating']
      ],
      include: [{ model: Review, as: 'reviews', attributes: [], duplicating: false }],
      group: ['Event.event_id'], raw: true, subQuery: false
    });
    sendSuccess(res, events.map(e => ({
      ...e,
      occupancy_rate: e.capacity > 0 ? ((e.current_registrations / e.capacity) * 100).toFixed(2) + '%' : '0%',
      avg_rating: e.avg_rating ? parseFloat(e.avg_rating).toFixed(1) : null
    })));
  } catch (err) {
    sendError(res, 'Etkinlik raporu hatası: ' + err.message, 500);
  }
});

// ════════════════════════════════════════
//  KULLANICI YÖNETİMİ (sadece admin)
// ════════════════════════════════════════

// GET /api/admin/users
router.get('/users', requireRole('admin'), async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password_hash'] },
      order: [['created_at', 'DESC']]
    });
    sendSuccess(res, users);
  } catch (err) {
    sendError(res, 'Kullanıcılar listelenirken hata: ' + err.message, 500);
  }
});

// PATCH /api/admin/users/:id/status — Dondur/Aktifleştir
router.patch('/users/:id/status', requireRole('admin'), async (req, res) => {
  try {
    const { is_active } = req.body;
    if (typeof is_active !== 'boolean') return sendError(res, 'is_active boolean olmalı', 400);
    if (parseInt(req.params.id) === req.user.id) return sendError(res, 'Kendinizi donduramaz/aktifleştiremezsiniz', 400);

    const user = await User.findByPk(req.params.id);
    if (!user) return sendError(res, 'Kullanıcı bulunamadı', 404);

    user.is_active = is_active;
    await user.save();
    sendSuccess(res, { user_id: user.user_id, is_active: user.is_active }, `Kullanıcı ${is_active ? 'aktifleştirildi' : 'donduruldu'}`);
  } catch (err) {
    sendError(res, 'Durum güncelleme hatası: ' + err.message, 500);
  }
});

// PATCH /api/admin/users/:id/role — Rol değiştir
router.patch('/users/:id/role', requireRole('admin'), async (req, res) => {
  try {
    const { role } = req.body;
    const validRoles = ['admin', 'gallery_manager', 'customer'];
    if (!validRoles.includes(role)) return sendError(res, 'Geçersiz rol', 400);
    if (parseInt(req.params.id) === req.user.id) return sendError(res, 'Kendi rolünüzü değiştiremezsiniz', 400);

    const user = await User.findByPk(req.params.id);
    if (!user) return sendError(res, 'Kullanıcı bulunamadı', 404);

    user.role = role;
    await user.save();
    sendSuccess(res, { user_id: user.user_id, role: user.role }, 'Kullanıcı rolü güncellendi');
  } catch (err) {
    sendError(res, 'Rol güncelleme hatası: ' + err.message, 500);
  }
});

// DELETE /api/admin/users/:id — Kullanıcı sil
router.delete('/users/:id', requireRole('admin'), async (req, res) => {
  try {
    if (parseInt(req.params.id) === req.user.id) return sendError(res, 'Kendinizi silemezsiniz', 400);
    const user = await User.findByPk(req.params.id);
    if (!user) return sendError(res, 'Kullanıcı bulunamadı', 404);

    await user.destroy();
    sendSuccess(res, null, 'Kullanıcı silindi');
  } catch (err) {
    sendError(res, 'Kullanıcı silme hatası: ' + err.message, 500);
  }
});

// ════════════════════════════════════════
//  ESER YÖNETİMİ (admin + manager)
// ════════════════════════════════════════

// GET /api/admin/artworks
router.get('/artworks', requireRole('admin', 'gallery_manager'), async (req, res) => {
  try {
    const artworks = await Artwork.findAll({
      include: [
        { model: Artist, as: 'artist', attributes: ['artist_id', 'name'] },
        { model: Category, as: 'category', attributes: ['category_id', 'name'] }
      ],
      order: [['created_at', 'DESC']]
    });
    sendSuccess(res, artworks);
  } catch (err) {
    sendError(res, 'Eserler listelenirken hata: ' + err.message, 500);
  }
});

// PUT /api/admin/artworks/:id
router.put('/artworks/:id', requireRole('admin', 'gallery_manager'), async (req, res) => {
  try {
    const artwork = await Artwork.findByPk(req.params.id);
    if (!artwork) return sendError(res, 'Eser bulunamadı', 404);

    const { title, description, artist_id, category_id, price, stock_quantity, is_available } = req.body;
    if (title) artwork.title = title;
    if (description !== undefined) artwork.description = description;
    if (artist_id) artwork.artist_id = artist_id;
    if (category_id) artwork.category_id = category_id;
    if (price !== undefined) artwork.price = price;
    if (stock_quantity !== undefined) artwork.stock_quantity = stock_quantity;
    if (is_available !== undefined) artwork.is_available = is_available;
    await artwork.save();

    sendSuccess(res, artwork, 'Eser güncellendi');
  } catch (err) {
    sendError(res, 'Eser güncelleme hatası: ' + err.message, 500);
  }
});

// DELETE /api/admin/artworks/:id
router.delete('/artworks/:id', requireRole('admin', 'gallery_manager'), async (req, res) => {
  try {
    const artwork = await Artwork.findByPk(req.params.id);
    if (!artwork) return sendError(res, 'Eser bulunamadı', 404);
    await artwork.destroy();
    sendSuccess(res, null, 'Eser silindi');
  } catch (err) {
    sendError(res, 'Eser silme hatası: ' + err.message, 500);
  }
});

// ════════════════════════════════════════
//  ETKİNLİK YÖNETİMİ (admin + manager)
// ════════════════════════════════════════

// GET /api/admin/events
router.get('/events', requireRole('admin', 'gallery_manager'), async (req, res) => {
  try {
    const events = await Event.findAll({ order: [['event_date', 'DESC']] });
    sendSuccess(res, events);
  } catch (err) {
    sendError(res, 'Etkinlikler listelenirken hata: ' + err.message, 500);
  }
});

// POST /api/admin/events
router.post('/events', requireRole('admin', 'gallery_manager'), async (req, res) => {
  try {
    const { title, description, event_date, event_time, duration_minutes, capacity, price, location } = req.body;
    const event = await Event.create({
      title, description, event_date, event_time, duration_minutes,
      capacity, price: price || 0, location,
      organizer_id: req.user.id, is_active: true, current_registrations: 0
    });
    sendSuccess(res, event, 'Etkinlik oluşturuldu', 201);
  } catch (err) {
    sendError(res, 'Etkinlik oluşturma hatası: ' + err.message, 500);
  }
});

// PUT /api/admin/events/:id
router.put('/events/:id', requireRole('admin', 'gallery_manager'), async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) return sendError(res, 'Etkinlik bulunamadı', 404);

    const { title, description, event_date, event_time, duration_minutes, capacity, price, location, is_active } = req.body;
    if (title) event.title = title;
    if (description !== undefined) event.description = description;
    if (event_date) event.event_date = event_date;
    if (event_time) event.event_time = event_time;
    if (duration_minutes) event.duration_minutes = duration_minutes;
    if (capacity) event.capacity = capacity;
    if (price !== undefined) event.price = price;
    if (location) event.location = location;
    if (is_active !== undefined) event.is_active = is_active;
    await event.save();

    sendSuccess(res, event, 'Etkinlik güncellendi');
  } catch (err) {
    sendError(res, 'Etkinlik güncelleme hatası: ' + err.message, 500);
  }
});

// DELETE /api/admin/events/:id
router.delete('/events/:id', requireRole('admin', 'gallery_manager'), async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) return sendError(res, 'Etkinlik bulunamadı', 404);
    await event.destroy();
    sendSuccess(res, null, 'Etkinlik silindi');
  } catch (err) {
    sendError(res, 'Etkinlik silme hatası: ' + err.message, 500);
  }
});

// ════════════════════════════════════════
//  SİPARİŞ YÖNETİMİ (admin + manager)
// ════════════════════════════════════════

// GET /api/admin/orders
router.get('/orders', requireRole('admin', 'gallery_manager'), async (req, res) => {
  try {
    const orders = await Order.findAll({
      include: [
        { model: OrderItem, as: 'items' },
        { model: User, as: 'user', attributes: ['user_id', 'username', 'full_name', 'email'] }
      ],
      order: [['created_at', 'DESC']]
    });
    sendSuccess(res, orders);
  } catch (err) {
    sendError(res, 'Siparişler listelenirken hata: ' + err.message, 500);
  }
});

// PATCH /api/admin/orders/:id/status
router.patch('/orders/:id/status', requireRole('admin', 'gallery_manager'), async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) return sendError(res, 'Geçersiz durum', 400);

    const order = await Order.findByPk(req.params.id);
    if (!order) return sendError(res, 'Sipariş bulunamadı', 404);

    order.status = status;
    await order.save();
    sendSuccess(res, { order_id: order.order_id, status: order.status }, 'Sipariş durumu güncellendi');
  } catch (err) {
    sendError(res, 'Durum güncelleme hatası: ' + err.message, 500);
  }
});

// ════════════════════════════════════════
//  YORUM YÖNETİMİ (admin + manager)
// ════════════════════════════════════════

// GET /api/admin/reviews
router.get('/reviews', requireRole('admin', 'gallery_manager'), async (req, res) => {
  try {
    const reviews = await Review.findAll({
      include: [
        { model: User, as: 'user', attributes: ['user_id', 'username', 'full_name'] },
        { model: ReviewReply, as: 'replies', include: [{ model: User, as: 'replier', attributes: ['user_id', 'username', 'full_name'] }] }
      ],
      order: [['created_at', 'DESC']]
    });
    sendSuccess(res, reviews);
  } catch (err) {
    sendError(res, 'Yorumlar listelenirken hata: ' + err.message, 500);
  }
});

// DELETE /api/admin/reviews/:id
router.delete('/reviews/:id', requireRole('admin', 'gallery_manager'), async (req, res) => {
  try {
    const review = await Review.findByPk(req.params.id);
    if (!review) return sendError(res, 'Yorum bulunamadı', 404);
    await review.destroy();
    sendSuccess(res, null, 'Yorum silindi');
  } catch (err) {
    sendError(res, 'Yorum silme hatası: ' + err.message, 500);
  }
});

// POST /api/admin/reviews/:id/reply
router.post('/reviews/:id/reply', requireRole('admin', 'gallery_manager'), async (req, res) => {
  try {
    const { reply_text } = req.body;
    if (!reply_text) return sendError(res, 'Yanıt metni gerekli', 400);

    const review = await Review.findByPk(req.params.id);
    if (!review) return sendError(res, 'Yorum bulunamadı', 404);

    const reply = await ReviewReply.create({
      review_id: review.review_id,
      replier_id: req.user.id,
      reply_text
    });

    sendSuccess(res, reply, 'Yanıt eklendi', 201);
  } catch (err) {
    sendError(res, 'Yanıt ekleme hatası: ' + err.message, 500);
  }
});

// ════════════════════════════════════════
//  KUPON YÖNETİMİ (sadece admin)
// ════════════════════════════════════════

// GET /api/admin/coupons
router.get('/coupons', requireRole('admin'), async (req, res) => {
  try {
    const coupons = await Coupon.findAll({ order: [['coupon_id', 'DESC']] });
    sendSuccess(res, coupons);
  } catch (err) {
    sendError(res, 'Kuponlar listelenirken hata: ' + err.message, 500);
  }
});

// POST /api/admin/coupons
router.post('/coupons', requireRole('admin'), async (req, res) => {
  try {
    const { code, discount_percent, discount_amount, valid_from, valid_until, max_uses, is_user_specific, target_user_id } = req.body;
    if (!code) return sendError(res, 'Kupon kodu gerekli', 400);

    const existing = await Coupon.findOne({ where: { code } });
    if (existing) return sendError(res, 'Bu kupon kodu zaten mevcut', 409);

    const coupon = await Coupon.create({
      code, discount_percent, discount_amount, valid_from, valid_until,
      max_uses: max_uses || 100, used_count: 0,
      is_user_specific: is_user_specific || false, target_user_id
    });
    sendSuccess(res, coupon, 'Kupon oluşturuldu', 201);
  } catch (err) {
    sendError(res, 'Kupon oluşturma hatası: ' + err.message, 500);
  }
});

// PUT /api/admin/coupons/:id
router.put('/coupons/:id', requireRole('admin'), async (req, res) => {
  try {
    const coupon = await Coupon.findByPk(req.params.id);
    if (!coupon) return sendError(res, 'Kupon bulunamadı', 404);

    const { code, discount_percent, discount_amount, valid_from, valid_until, max_uses, is_user_specific, target_user_id } = req.body;
    if (code) coupon.code = code;
    if (discount_percent !== undefined) coupon.discount_percent = discount_percent;
    if (discount_amount !== undefined) coupon.discount_amount = discount_amount;
    if (valid_from) coupon.valid_from = valid_from;
    if (valid_until) coupon.valid_until = valid_until;
    if (max_uses !== undefined) coupon.max_uses = max_uses;
    if (is_user_specific !== undefined) coupon.is_user_specific = is_user_specific;
    if (target_user_id !== undefined) coupon.target_user_id = target_user_id;
    await coupon.save();

    sendSuccess(res, coupon, 'Kupon güncellendi');
  } catch (err) {
    sendError(res, 'Kupon güncelleme hatası: ' + err.message, 500);
  }
});

// DELETE /api/admin/coupons/:id
router.delete('/coupons/:id', requireRole('admin'), async (req, res) => {
  try {
    const coupon = await Coupon.findByPk(req.params.id);
    if (!coupon) return sendError(res, 'Kupon bulunamadı', 404);
    await coupon.destroy();
    sendSuccess(res, null, 'Kupon silindi');
  } catch (err) {
    sendError(res, 'Kupon silme hatası: ' + err.message, 500);
  }
});

module.exports = router;
