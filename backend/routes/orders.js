const express = require('express');
const { Op } = require('sequelize');
const { Order, OrderItem, Artwork, Event, Reservation, Coupon } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { orderRules } = require('../middleware/validate');
const sequelize = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');

const router = express.Router();

// POST /api/orders — Sipariş oluştur
router.post('/', requireAuth, orderRules, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { items, payment_method, coupon_code } = req.body;

    // Stok kontrolü + toplam hesaplama
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      if (item.item_type === 'artwork') {
        const artwork = await Artwork.findByPk(item.item_id, { transaction: t });
        if (!artwork) {
          await t.rollback();
          return sendError(res, `Eser bulunamadı: ID ${item.item_id}`, 404);
        }
        if (!artwork.is_available || artwork.stock_quantity < item.quantity) {
          await t.rollback();
          return sendError(res, `Yetersiz stok: "${artwork.title}" (Mevcut: ${artwork.stock_quantity})`, 409);
        }
        orderItems.push({ item_type: 'artwork', item_id: item.item_id, quantity: item.quantity, unit_price: parseFloat(artwork.price) });
        totalAmount += parseFloat(artwork.price) * item.quantity;
      } else if (item.item_type === 'event') {
        const event = await Event.findByPk(item.item_id, { transaction: t });
        if (!event) {
          await t.rollback();
          return sendError(res, `Etkinlik bulunamadı: ID ${item.item_id}`, 404);
        }
        if (!event.is_active || (event.capacity - event.current_registrations) < item.quantity) {
          await t.rollback();
          return sendError(res, `Yetersiz kontenjan: "${event.title}"`, 409);
        }
        orderItems.push({ item_type: 'event', item_id: item.item_id, quantity: item.quantity, unit_price: parseFloat(event.price) });
        totalAmount += parseFloat(event.price) * item.quantity;
      }
    }

    // Kupon kontrolü
    let coupon = null;
    let discountAmount = 0;
    if (coupon_code) {
      coupon = await Coupon.findOne({
        where: {
          code: coupon_code,
          valid_from: { [Op.lte]: new Date() },
          valid_until: { [Op.gte]: new Date() }
        },
        transaction: t
      });

      if (!coupon) {
        await t.rollback();
        return sendError(res, 'Geçersiz veya süresi dolmuş kupon', 400);
      }
      if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
        await t.rollback();
        return sendError(res, 'Kupon kullanım limiti dolmuş', 400);
      }
      if (coupon.is_user_specific && coupon.target_user_id !== req.user.id) {
        await t.rollback();
        return sendError(res, 'Bu kupon sizin için geçerli değil', 403);
      }

      if (coupon.discount_percent) {
        discountAmount = totalAmount * (parseFloat(coupon.discount_percent) / 100);
      } else if (coupon.discount_amount) {
        discountAmount = parseFloat(coupon.discount_amount);
      }
      discountAmount = Math.min(discountAmount, totalAmount);
    }

    // Sipariş oluştur
    const order = await Order.create({
      user_id: req.user.id,
      total_amount: totalAmount - discountAmount,
      status: 'pending',
      payment_method,
      coupon_id: coupon?.coupon_id || null,
      discount_amount: discountAmount
    }, { transaction: t });

    // Sipariş kalemleri
    for (const item of orderItems) {
      await OrderItem.create({ ...item, order_id: order.order_id }, { transaction: t });
    }

    // Stok ve Kontenjan düşür
    for (const item of items) {
      if (item.item_type === 'artwork') {
        await Artwork.decrement('stock_quantity', { by: item.quantity, where: { artwork_id: item.item_id }, transaction: t });
      } else if (item.item_type === 'event') {
        await Event.increment('current_registrations', { by: item.quantity, where: { event_id: item.item_id }, transaction: t });
        // İş mantığı zenginliği: Sepette bilet varsa Reservation oluştur
        await Reservation.create({
          user_id: req.user.id,
          event_id: item.item_id,
          participant_count: item.quantity,
          reservation_date: new Date().toISOString().split('T')[0],
          reservation_time: '00:00', // Varsa eventin saatini bulup atayabiliriz ama şimdilik placeholder
          status: 'confirmed'
        }, { transaction: t });
      }
    }

    // Kupon kullanım sayısı
    if (coupon) {
      await coupon.increment('used_count', { transaction: t });
    }

    await t.commit();

    const fullOrder = await Order.findByPk(order.order_id, {
      include: [{ model: OrderItem, as: 'items' }]
    });

    sendSuccess(res, { order: fullOrder }, 'Sipariş oluşturuldu', 201);
  } catch (err) {
    await t.rollback();
    sendError(res, 'Sipariş oluşturulurken hata: ' + err.message, 500);
  }
});

// POST /api/orders/:id/confirm — Ödeme onayla
router.post('/:id/confirm', requireAuth, async (req, res) => {
  try {
    const order = await Order.findOne({
      where: { order_id: req.params.id, user_id: req.user.id }
    });
    if (!order) return sendError(res, 'Sipariş bulunamadı', 404);
    if (order.status !== 'pending') {
      return sendError(res, 'Bu sipariş onaylanamaz', 400);
    }

    order.status = 'paid';
    await order.save();
    sendSuccess(res, { order }, 'Ödeme onaylandı');
  } catch (err) {
    sendError(res, 'Ödeme onaylanırken hata', 500);
  }
});

// GET /api/orders — Kullanıcının siparişleri
router.get('/', requireAuth, async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: { user_id: req.user.id },
      include: [{
        model: OrderItem, as: 'items',
        include: [
          { model: Artwork, as: 'artwork', attributes: ['artwork_id', 'title', 'image_url'] },
          { model: Event, as: 'event', attributes: ['event_id', 'title'] }
        ]
      }],
      order: [['created_at', 'DESC']]
    });
    sendSuccess(res, orders);
  } catch (err) {
    sendError(res, 'Siparişler listelenirken hata: ' + err.message, 500);
  }
});

// GET /api/orders/:id — Sipariş detayı
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const order = await Order.findOne({
      where: { order_id: req.params.id, user_id: req.user.id },
      include: [
        {
          model: OrderItem, as: 'items',
          include: [
            { model: Artwork, as: 'artwork', attributes: ['artwork_id', 'title', 'image_url'] },
            { model: Event, as: 'event', attributes: ['event_id', 'title'] }
          ]
        },
        { model: Coupon, as: 'coupon' }
      ]
    });
    if (!order) return sendError(res, 'Sipariş bulunamadı', 404);
    sendSuccess(res, order);
  } catch (err) {
    sendError(res, 'Sipariş detayı alınırken hata: ' + err.message, 500);
  }
});

module.exports = router;
