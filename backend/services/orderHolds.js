const { Op } = require('sequelize');
const sequelize = require('../config/database');
const { Order, OrderItem, OrderStatusAudit, Reservation, Coupon } = require('../models');
const { releaseArtwork, releaseEvent, InventoryConflict } = require('./inventory');

// New orders reserve inventory for a bounded time. Legacy rows with a NULL
// expiry are intentionally excluded until a migration/reconciliation.
const HOLD_MINUTES = (() => {
  const candidate = process.env.PENDING_ORDER_TTL_MINUTES || '1440';
  const value = Number(candidate);
  if (!Number.isSafeInteger(value) || value < 15 || value > 10080) {
    throw new Error('PENDING_ORDER_TTL_MINUTES must be an integer between 15 and 10080');
  }
  return value;
})();

class HoldError extends Error {
  constructor(message, statusCode = 409) {
    super(message);
    this.statusCode = statusCode;
  }
}

function newExpiration() {
  return new Date(Date.now() + HOLD_MINUTES * 60 * 1000);
}

async function releaseAllocations(order, transaction, reservationStatus) {
  const items = await OrderItem.findAll({
    where: { order_id: order.order_id }, transaction
  });
  const bookings = await Reservation.findAll({
    where: { order_id: order.order_id }, transaction
  });
  const eventItems = items.filter(item => item.item_type === 'event');
  // Refuse legacy event orders with no exact order->reservation mapping.
  if (eventItems.length !== bookings.length ||
    eventItems.some(item => !bookings.some(r =>
      Number(r.event_id) === Number(item.item_id) &&
      Number(r.participant_count) === Number(item.quantity) &&
      r.status === reservationStatus))) {
    throw new HoldError('Etkinlik rezervasyon kayıtlarıyla sipariş eşleşmiyor; manuel inceleme gerekli');
  }
  for (const item of items) {
    if (item.item_type === 'artwork') {
      await releaseArtwork(item.item_id, item.quantity, transaction);
    } else {
      await releaseEvent(item.item_id, item.quantity, transaction);
    }
  }
  for (const booking of bookings) {
    const [changed] = await Reservation.update({ status: 'cancelled' }, {
      where: { reservation_id: booking.reservation_id, order_id: order.order_id,
        status: reservationStatus }, transaction
    });
    if (changed !== 1) throw new HoldError('Rezervasyon başka bir işlemle değiştirildi');
  }
  if (order.coupon_id) {
    const [changed] = await Coupon.update({
      used_count: sequelize.literal('used_count - 1')
    }, {
      where: { coupon_id: order.coupon_id, used_count: { [Op.gte]: 1 } },
      transaction
    });
    if (changed !== 1) throw new HoldError('Kupon kullanım sayısı tutarsız; işlem geri alındı');
  }
}

async function closeOrder(id, { actorId = null, userId = null,
  action = 'pending_cancelled', refundEvidence = null } = {}) {
  return sequelize.transaction(async transaction => {
    const order = await Order.findByPk(id, { transaction });
    if (!order) throw new HoldError('Sipariş bulunamadı', 404);
    if (userId && Number(order.user_id) !== Number(userId)) {
      throw new HoldError('Bu siparişe erişiminiz yok', 404);
    }
    if (order.status === 'cancelled') {
      return { order_id: order.order_id, status: 'cancelled', already_closed: true };
    }
    const refund = action === 'manual_bank_refund';
    if (refund ? order.status !== 'paid' : order.status !== 'pending') {
      throw new HoldError(refund
        ? 'Yalnızca ödenmiş ve henüz sevk edilmemiş sipariş manuel iadeye uygundur'
        : 'Yalnızca ödeme bekleyen sipariş iptal edilebilir');
    }
    if (refund && (!actorId || !refundEvidence)) {
      throw new HoldError('İade için banka hesabından yapılmış çıkışın yönetici kontrolü gerekir');
    }
    const previous = order.status;
    const [changed] = await Order.update({ status: 'cancelled' }, {
      where: { order_id: id, status: previous }, transaction
    });
    if (changed !== 1) throw new HoldError('Sipariş durumu değişti, işlem tekrarlanmalı');

    await releaseAllocations(order, transaction, refund ? 'confirmed' : 'pending');
    await OrderStatusAudit.create({
      order_id: id, actor_id: actorId, action,
      from_status: previous, to_status: 'cancelled',
      ...(refund ? refundEvidence : {})
    }, { transaction });
    return { order_id: id, status: 'cancelled', already_closed: false };
  });
}

async function expirePendingOrders(batchLimit = 100) {
  const expired = await Order.findAll({
    where: { status: 'pending', expires_at: { [Op.lte]: new Date(), [Op.ne]: null } },
    order: [['expires_at', 'ASC']], limit: batchLimit,
    attributes: ['order_id']
  });
  let closed = 0;
  for (const order of expired) {
    try {
      const r = await closeOrder(order.order_id, { action: 'hold_expired' });
      if (!r.already_closed) closed++;
    } catch (err) {
      // Another worker may have confirmed/cancelled it first.
      if (err instanceof HoldError || err instanceof InventoryConflict) continue;
      throw err;
    }
  }
  return closed;
}

module.exports = { HoldError, HOLD_MINUTES, newExpiration, closeOrder, expirePendingOrders };
