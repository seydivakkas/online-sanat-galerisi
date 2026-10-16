const { UniqueConstraintError } = require('sequelize');
const sequelize = require('../config/database');
const { withInventoryTransaction } = require('./transactionGate');
const { Order, OrderItem, OrderStatusAudit, Reservation, Event } = require('../models');
const { closeOrder } = require('./orderHolds');

class OrderTransitionError extends Error {
  constructor(message, statusCode = 409) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Currency is compared in integer minor units; refuse ambiguous rounding.
function toCents(value) {
  const str = String(value);
  if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(str)) return null;
  const [whole, fraction = ''] = str.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(cents) ? cents : null;
}

function validateBankEvidence(data) {
  const payment_reference = typeof data.payment_reference === 'string'
    ? data.payment_reference.trim().toUpperCase() : '';
  const evidence_source = data.evidence_source;
  const evidence_date = data.evidence_date;
  const evidence_note = typeof data.evidence_note === 'string'
    ? data.evidence_note.trim() : '';
  const amountCents = toCents(data.verified_amount);
  if (!/^[A-Z0-9][A-Z0-9/_-]{7,79}$/.test(payment_reference)) {
    throw new OrderTransitionError('Banka işlem referansı 8-80 karakter olmalıdır', 400);
  }
  if (!['bank_statement', 'bank_portal'].includes(evidence_source)) {
    throw new OrderTransitionError('Banka ekstresi veya banka paneli kaynak türü seçilmeli', 400);
  }
  const parsed = typeof evidence_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(evidence_date)
    ? new Date(evidence_date + 'T00:00:00Z') : null;
  if (!parsed || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== evidence_date ||
    evidence_date > new Date().toISOString().slice(0, 10)) {
    throw new OrderTransitionError('Geçerli ve gelecekte olmayan banka işlem tarihi gerekli', 400);
  }
  if (amountCents === null || amountCents <= 0) {
    throw new OrderTransitionError('Pozitif ve en fazla iki ondalıklı tutar gerekli', 400);
  }
  if (evidence_note.length < 15 || evidence_note.length > 500) {
    throw new OrderTransitionError('Kontrol notu 15-500 karakter olmalı', 400);
  }
  return { payment_reference, evidence_source, evidence_date,
    evidence_note, amountCents };
}

// This is a MANUAL bank statement attestation, not an automated bank API
// verification. The operator must actually compare the bank transaction.
async function verifyBankTransfer(orderId, actorId, data) {
  const proof = validateBankEvidence(data || {});
  try {
    return await withInventoryTransaction(async transaction => {
      const order = await Order.findByPk(orderId, { transaction });
      if (!order) throw new OrderTransitionError('Sipariş bulunamadı', 404);
      if (order.status !== 'pending') {
        throw new OrderTransitionError('Yalnızca bekleyen sipariş onaylanabilir');
      }
      if (order.payment_method !== 'bank_transfer') {
        throw new OrderTransitionError('Entegrasyonu olmayan ödeme yöntemi onaylanamaz');
      }

      if (order.expires_at && new Date(order.expires_at).getTime() <= Date.now()) {
        throw new OrderTransitionError('Siparişin stok/kontenjan ayırma süresi doldu');
      }
      const eventItems = await OrderItem.findAll({
        where: { order_id: orderId, item_type: 'event' }, transaction
      });
      const bookings = await Reservation.findAll({
        where: { order_id: orderId }, transaction
      });
      if (eventItems.length !== bookings.length ||
        eventItems.some(item => !bookings.some(r =>
          Number(r.event_id) === Number(item.item_id) &&
          Number(r.participant_count) === Number(item.quantity) &&
          r.status === 'pending'))) {
        throw new OrderTransitionError('Siparişe bağlı rezervasyonlar doğrulanamadı');
      }
      const expectedCents = toCents(order.total_amount);
      if (expectedCents === null || expectedCents !== proof.amountCents) {
        throw new OrderTransitionError('Doğrulanan banka tutarı sipariş toplamıyla aynı olmalı');
      }

      // Conditional write protects against stale/double status transitions.
      const [changed] = await Order.update({ status: 'paid' }, {
        where: { order_id: order.order_id, status: 'pending' }, transaction
      });
      if (changed !== 1) {
        throw new OrderTransitionError('Sipariş durumu değişmiş; onay yeniden değerlendirilmeli');
      }

      if (bookings.length) {
        const [confirmed] = await Reservation.update({ status: 'confirmed' }, {
          where: { order_id: order.order_id, status: 'pending' }, transaction
        });
        if (confirmed !== bookings.length) {
          throw new OrderTransitionError('Etkinlik rezervasyonlarının tamamı onaylanamadı');
        }
      }
      await OrderStatusAudit.create({
        order_id: order.order_id,
        actor_id: actorId,
        action: 'manual_bank_attestation',
        from_status: 'pending',
        to_status: 'paid',
        payment_reference: proof.payment_reference,
        verified_amount: (proof.amountCents / 100).toFixed(2),
        evidence_source: proof.evidence_source,
        evidence_date: proof.evidence_date,
        evidence_note: proof.evidence_note
      }, { transaction });
      return { order_id: order.order_id, status: 'paid', verification: 'manual_bank_attestation' };
    });
  } catch (err) {
    if (err instanceof UniqueConstraintError) {
      throw new OrderTransitionError('Banka işlem referansı başka bir siparişte kullanılmış');
    }
    throw err;
  }
}

async function advanceOrderStatus(orderId, actorId, targetStatus) {
  if (!['shipped', 'delivered'].includes(targetStatus)) {
    throw new OrderTransitionError('Ödeme ve iptal durumları bu uç noktadan değiştirilemez', 409);
  }
  const expectedPrevious = targetStatus === 'shipped' ? 'paid' : 'shipped';
  return withInventoryTransaction(async transaction => {
    const order = await Order.findByPk(orderId, { transaction });
    if (!order) throw new OrderTransitionError('Sipariş bulunamadı', 404);
    if (order.status !== expectedPrevious) {
      throw new OrderTransitionError('Geçersiz sipariş durum geçişi');
    }
    // The previous version allowed customers to self-confirm as paid.
    // Historical paid/shipped records are untrusted unless reconciled.
    const bankEvidence = await OrderStatusAudit.findOne({
      where: { order_id: orderId, action: 'manual_bank_attestation',
        to_status: 'paid' }, transaction
    });
    if (!bankEvidence) {
      throw new OrderTransitionError('Eski sipariş için doğrulanmış banka mutabakat kaydı yok');
    }
    const eventTickets = await OrderItem.count({
      where: { order_id: orderId, item_type: 'event' }, transaction
    });
    if (eventTickets > 0) {
      throw new OrderTransitionError('Etkinlik siparişlerinde P1 rezervasyon mutabakatı gerekli');
    }
    const [changed] = await Order.update({ status: targetStatus }, {
      where: { order_id: orderId, status: expectedPrevious }, transaction
    });
    if (changed !== 1) throw new OrderTransitionError('Sipariş eşzamanlı olarak güncellenmiş');
    await OrderStatusAudit.create({
      order_id: orderId, actor_id: actorId,
      action: 'fulfillment_transition',
      from_status: expectedPrevious, to_status: targetStatus
    }, { transaction });
    return { order_id: orderId, status: targetStatus };
  });
}


async function refundBankTransfer(orderId, actorId, data) {
  const proof = validateBankEvidence(data || {});
  const order = await Order.findByPk(orderId);
  if (!order) throw new OrderTransitionError('Sipariş bulunamadı', 404);
  if (order.status !== 'paid' || order.payment_method !== 'bank_transfer') {
    throw new OrderTransitionError('Yalnızca havaleyle ödenmiş, henüz sevk edilmemiş sipariş iade edilebilir');
  }
  const proofOfReceipt = await OrderStatusAudit.findOne({
    where: { order_id: orderId, action: 'manual_bank_attestation' }
  });
  if (!proofOfReceipt) throw new OrderTransitionError('Ödemenin doğrulanmış banka kaydı yok');
  const expected = toCents(order.total_amount);
  if (expected === null || proof.amountCents !== expected) {
    throw new OrderTransitionError('Çıkış işlemi tutarı sipariş toplamına eşit olmalı');
  }
  if (proof.payment_reference === proofOfReceipt.payment_reference) {
    throw new OrderTransitionError('İade referansı tahsilat referansından farklı olmalı');
  }
  // Paid event tickets are refundable here only before the advertised session.
  const eventItems = await OrderItem.findAll({ where: {
    order_id: orderId, item_type: 'event'
  } });
  for (const item of eventItems) {
    const event = await Event.findByPk(item.item_id);
    if (!event || Date.parse(event.event_date + 'T' + event.event_time + ':00+03:00') <= Date.now()) {
      throw new OrderTransitionError('Geçmiş veya silinmiş etkinlik otomatik iade için uygun değil');
    }
  }
  try {
    return await closeOrder(orderId, {
      actorId,
      action: 'manual_bank_refund',
      refundEvidence: {
        payment_reference: proof.payment_reference,
        verified_amount: (proof.amountCents / 100).toFixed(2),
        evidence_source: proof.evidence_source,
        evidence_date: proof.evidence_date,
        evidence_note: proof.evidence_note
      }
    });
  } catch (err) {
    if (err instanceof UniqueConstraintError) {
      throw new OrderTransitionError('Banka iade referansı başka bir işlemde kullanılmış');
    }
    throw err;
  }
}

module.exports = { OrderTransitionError, verifyBankTransfer, refundBankTransfer, advanceOrderStatus, toCents };
