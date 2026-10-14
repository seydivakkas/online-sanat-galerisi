const express = require('express');
const { Op } = require('sequelize');
const { reserveArtwork, reserveEvent, validEventSlot } = require('../services/inventory');
const { newExpiration, expirePendingOrders, closeOrder } = require('../services/orderHolds');
const { toCents } = require('../services/orderLifecycle');
class OrderError extends Error {
  constructor(message, statusCode = 409) { super(message); this.statusCode = statusCode; }
}
const { Order, OrderItem, Artwork, Event, Reservation, Coupon } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { orderRules } = require('../middleware/validate');
const sequelize = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');

const router = express.Router();

// New orders own a bounded inventory hold until manual bank verification.
router.post('/', requireAuth, orderRules, async (req, res) => {
  if (req.body.payment_method !== 'bank_transfer') {
    return sendError(res, 'Kart ve PayPal ödeme altyapısı henüz bağlı değil', 409);
  }
  const { items, payment_method, coupon_code } = req.body;
  const distinct = new Set(items.map(i => i.item_type + ':' + i.item_id));
  if (distinct.size !== items.length) {
    return sendError(res, 'Aynı ürün veya etkinlik sepette yalnızca bir kez bulunmalı', 400);
  }
  try {
    // Clear stale holds before attempting new conditional capacity updates.
    await expirePendingOrders();
    const orderId = await sequelize.transaction(async transaction => {
      let totalCents = 0;
      const orderItems = [];
      for (const item of items) {
        if (item.item_type === 'artwork') {
          const artwork = await Artwork.findByPk(item.item_id, { transaction });
          if (!artwork) throw new OrderError('Eser bulunamadı', 404);
          const priceCents = toCents(artwork.price);
          if (priceCents === null) throw new OrderError('Eser fiyatı geçersiz', 409);
          await reserveArtwork(artwork.artwork_id, item.quantity, transaction);
          orderItems.push({
            item_type: 'artwork', item_id: artwork.artwork_id,
            quantity: Number(item.quantity), unit_price: artwork.price
          });
          totalCents += priceCents * Number(item.quantity);
        } else if (item.item_type === 'event') {
          const event = await Event.findByPk(item.item_id, { transaction });
          if (!event) throw new OrderError('Etkinlik bulunamadı', 404);
          validEventSlot(event, item.reservation_date, item.reservation_time);
          const priceCents = toCents(event.price);
          if (priceCents === null) throw new OrderError('Etkinlik fiyatı geçersiz', 409);
          if (priceCents === 0) {
            throw new OrderError('Ücretsiz etkinlikler doğrudan rezervasyon ekranından kaydedilir', 409);
          }
          const duplicate = await Reservation.findOne({
            where: { user_id: req.user.id, event_id: event.event_id,
              status: { [Op.ne]: 'cancelled' } }, transaction
          });
          if (duplicate) throw new OrderError('Bu etkinlikte aktif rezervasyonunuz var', 409);
          await reserveEvent(event, item.quantity, transaction);
          orderItems.push({
            item_type: 'event', item_id: event.event_id,
            quantity: Number(item.quantity), unit_price: event.price,
            reservation_date: event.event_date, reservation_time: event.event_time
          });
          totalCents += priceCents * Number(item.quantity);
        }
        if (!Number.isSafeInteger(totalCents)) throw new OrderError('Toplam tutar hesaplanamadı', 400);
      }

      let coupon = null;
      let discountCents = 0;
      if (coupon_code) {
        const today = new Date().toISOString().slice(0, 10);
        coupon = await Coupon.findOne({
          where: { code: coupon_code,
            valid_from: { [Op.lte]: today }, valid_until: { [Op.gte]: today } },
          transaction
        });
        if (!coupon || (coupon.is_user_specific && Number(coupon.target_user_id) !== req.user.id)) {
          throw new OrderError('Kupon geçersiz veya kullanıcıya ait değil', 400);
        }
        if (coupon.discount_percent) {
          discountCents = Math.round(totalCents * Number(coupon.discount_percent) / 100);
        } else if (coupon.discount_amount) {
          discountCents = toCents(coupon.discount_amount);
          if (discountCents === null) throw new OrderError('Kupon tutarı geçersiz', 400);
        }
        discountCents = Math.min(totalCents, Math.max(0, discountCents));
        if (coupon.max_uses) {
          const [updated] = await Coupon.update({
            used_count: sequelize.literal('used_count + 1')
          }, {
            where: { coupon_id: coupon.coupon_id,
              used_count: { [Op.lt]: coupon.max_uses } }, transaction
          });
          if (updated !== 1) throw new OrderError('Kupon kullanım limiti dolmuş', 409);
        } else {
          await Coupon.increment('used_count', {
            where: { coupon_id: coupon.coupon_id }, transaction
          });
        }
      }

      if (totalCents - discountCents <= 0) {
        throw new OrderError('Ücretsiz siparişler banka ödeme talebiyle açılamaz', 409);
      }
      const order = await Order.create({
        user_id: req.user.id,
        total_amount: ((totalCents - discountCents) / 100).toFixed(2),
        status: 'pending', payment_method,
        coupon_id: coupon?.coupon_id || null,
        discount_amount: (discountCents / 100).toFixed(2),
        expires_at: newExpiration()
      }, { transaction });
      for (const item of orderItems) {
        await OrderItem.create({
          order_id: order.order_id, item_type: item.item_type, item_id: item.item_id,
          quantity: item.quantity, unit_price: item.unit_price
        }, { transaction });
        if (item.item_type === 'event') {
          await Reservation.create({
            user_id: req.user.id, order_id: order.order_id,
            event_id: item.item_id, participant_count: item.quantity,
            reservation_date: item.reservation_date,
            reservation_time: item.reservation_time,
            status: 'pending'
          }, { transaction });
        }
      }
      return order.order_id;
    });
    const fullOrder = await Order.findByPk(orderId, {
      include: [{ model: OrderItem, as: 'items' },
        { model: Reservation, as: 'reservations' }]
    });
    return sendSuccess(res, { order: fullOrder },
      'Sipariş oluşturuldu; ödeme doğrulanana kadar stok ve kontenjan süreli ayrıldı', 201);
  } catch (err) {
    if (err.statusCode) return sendError(res, err.message, err.statusCode);
    console.error('Sipariş oluşturulurken hata:', err);
    return sendError(res, 'Sipariş oluşturulurken hata', 500);
  }
});

// Legacy route intentionally disabled. A user-provided request or payment
// receipt is never authoritative evidence of settlement.
router.post('/:id/confirm', requireAuth, (req, res) => {
  return sendError(res, 'Müşteri ödeme onayı kaldırıldı; banka havalelerini yalnızca yetkili yönetici banka kayıtlarından doğrulayabilir', 410);
});

// POST /api/orders/:id/cancel — pending order release; paid orders require audited refund.
router.post('/:id/cancel', requireAuth, async (req, res) => {
  try {
    const result = await closeOrder(req.params.id, {
      userId: req.user.id, actorId: req.user.id, action: 'pending_cancelled'
    });
    return sendSuccess(res, result, 'Sipariş iptal edildi; ayrılan stok geri açıldı');
  } catch (err) {
    if (err.statusCode) return sendError(res, err.message, err.statusCode);
    console.error('Sipariş iptali hatası:', err);
    return sendError(res, 'Sipariş iptal edilemedi', 500);
  }
});

// GET /api/orders — Kullanıcının siparişleri
// ┌─ SQL Karşılığı (Polimorfik JOIN) ─────────────────────────────────────┐
// │ SELECT o.*, oi.*,                                                     │
// │   CASE WHEN oi.item_type = 'artwork'                                  │
// │     THEN a.title ELSE e.title END AS urun_adi                         │
// │ FROM orders o                                                         │
// │ INNER JOIN order_items oi ON o.order_id = oi.order_id                 │
// │ LEFT JOIN artworks a ON oi.item_type='artwork'                        │
// │   AND oi.item_id = a.artwork_id                                       │
// │ LEFT JOIN events e ON oi.item_type='event'                            │
// │   AND oi.item_id = e.event_id                                         │
// │ WHERE o.user_id = ?                                                   │
// │ ORDER BY o.created_at DESC                                            │
// └───────────────────────────────────────────────────────────────────────┘
router.get('/', requireAuth, async (req, res) => {
  try {
    await expirePendingOrders();
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
    await expirePendingOrders();
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
