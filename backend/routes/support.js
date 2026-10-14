const express = require('express');
const { SupportTicket, SupportMessage, User } = require('../models');
const { requireAuth, requireRole } = require('../middleware/auth');
const { withInventoryTransaction } = require('../services/transactionGate');
const { ticketRules } = require('../middleware/validate');
const { sendSuccess, sendError } = require('../utils/response');

const router = express.Router();

// POST /api/support/tickets — Yeni destek talebi
// ┌─ SQL Karşılığı (İki tabloya INSERT — ana kayıt + ilk mesaj) ─────────┐
// │ INSERT INTO support_tickets (user_id, subject, message, status)       │
// │ VALUES (?, ?, ?, 'open')                                              │
// │                                                                       │
// │ INSERT INTO support_messages (ticket_id, sender_id, message_text)    │
// │ VALUES (last_insert_rowid(), ?, ?)                                    │
// └───────────────────────────────────────────────────────────────────────┘
router.post('/tickets', requireAuth, ticketRules, async (req, res) => {
  try {
    const ticket = await withInventoryTransaction(async transaction => {
      const created = await SupportTicket.create({
        user_id: req.user.id, subject: req.body.subject,
        message: req.body.message, status: 'open'
      }, { transaction });
      await SupportMessage.create({
        ticket_id: created.ticket_id, sender_id: req.user.id,
        message_text: req.body.message
      }, { transaction });
      return created;
    });
    return sendSuccess(res, { ticket }, 'Destek talebi oluşturuldu', 201);
  } catch (err) {
    return sendError(res, 'Destek talebi oluşturulamadı', 500);
  }
});

// GET /api/support/tickets — Kullanıcının talepleri
// ┌─ SQL Karşılığı ───────────────────────────────────────────────────────┐
// │ SELECT * FROM support_tickets                                         │
// │ WHERE user_id = ?                                                     │
// │ ORDER BY created_at DESC                                              │
// └───────────────────────────────────────────────────────────────────────┘
router.get('/tickets', requireAuth, async (req, res) => {
  try {
    const tickets = await SupportTicket.findAll({
      where: { user_id: req.user.id },
      order: [['created_at', 'DESC']]
    });
    sendSuccess(res, tickets);
  } catch (err) {
    sendError(res, 'Talepler listelenirken hata', 500);
  }
});

// GET /api/support/tickets/:id — Talep detayı + mesajlar
// ┌─ SQL Karşılığı (3 tablo JOIN — ticket + mesajlar + gönderici) ───────┐
// │ SELECT t.*, m.*, u.username, u.full_name, u.role                      │
// │ FROM support_tickets t                                                │
// │ LEFT JOIN support_messages m ON t.ticket_id = m.ticket_id            │
// │ LEFT JOIN users u ON m.sender_id = u.user_id                          │
// │ WHERE t.ticket_id = ? AND t.user_id = ?                               │
// │ ORDER BY m.sent_at ASC                                                │
// └───────────────────────────────────────────────────────────────────────┘
router.get('/tickets/:id', requireAuth, async (req, res) => {
  try {
    const ticket = await SupportTicket.findOne({
      where: { ticket_id: req.params.id,
        ...(['admin', 'gallery_manager'].includes(req.user.role) ? {} : { user_id: req.user.id }) },
      include: [{
        model: SupportMessage,
        as: 'messages',
        include: [{ model: User, as: 'sender', attributes: ['username', 'full_name', 'role'] }],
        order: [['sent_at', 'ASC']]
      }]
    });
    if (!ticket) return sendError(res, 'Talep bulunamadı', 404);
    sendSuccess(res, ticket);
  } catch (err) {
    sendError(res, 'Talep detayı alınırken hata', 500);
  }
});

// POST /api/support/tickets/:id/messages — Yeni mesaj gönder
// ┌─ SQL Karşılığı (INSERT + durum UPDATE) ──────────────────────────────┐
// │ INSERT INTO support_messages (ticket_id, sender_id, message_text)    │
// │ VALUES (?, ?, ?)                                                      │
// │                                                                       │
// │ -- Durum otomatik güncelleme (state machine)                          │
// │ UPDATE support_tickets SET status = 'in_progress'                     │
// │ WHERE ticket_id = ? AND status = 'open'                               │
// └───────────────────────────────────────────────────────────────────────┘
router.post('/tickets/:id/messages', requireAuth, async (req, res) => {
  const messageText = typeof req.body.message_text === 'string'
    ? req.body.message_text.trim() : '';
  if (messageText.length < 1 || messageText.length > 5000) {
    return sendError(res, 'Mesaj 1-5000 karakter olmalı', 400);
  }
  try {
    const message = await withInventoryTransaction(async transaction => {
      const ticket = await SupportTicket.findByPk(req.params.id, { transaction });
      if (!ticket) throw Object.assign(new Error('Talep bulunamadı'), { statusCode: 404 });
      const staff = ['admin', 'gallery_manager'].includes(req.user.role);
      if (!staff && ticket.user_id !== req.user.id) {
        throw Object.assign(new Error('Bu talebe erişim yetkiniz yok'), { statusCode: 403 });
      }
      if (ticket.status === 'closed') {
        throw Object.assign(new Error('Kapatılmış talebe mesaj eklenemez'), { statusCode: 409 });
      }
      const created = await SupportMessage.create({
        ticket_id: ticket.ticket_id, sender_id: req.user.id,
        message_text: messageText
      }, { transaction });
      if (ticket.status === 'open' || (ticket.status === 'resolved' && !staff)) {
        await SupportTicket.update({ status: 'in_progress' }, {
          where: { ticket_id: ticket.ticket_id }, transaction
        });
      }
      return created;
    });
    return sendSuccess(res, message, 'Mesaj gönderildi', 201);
  } catch (err) {
    return sendError(res, err.statusCode ? err.message : 'Mesaj gönderilemedi', err.statusCode || 500);
  }
});

// Admin/manager ticket queue, including customers' tickets.
router.get('/admin/tickets', requireAuth, requireRole('admin', 'gallery_manager'), async (req, res) => {
  try {
    const where = ['open', 'in_progress', 'resolved', 'closed'].includes(req.query.status)
      ? { status: req.query.status } : {};
    const tickets = await SupportTicket.findAll({
      where, include: [{ model: User, as: 'user',
        attributes: ['user_id', 'username', 'full_name', 'email'] }],
      order: [['created_at', 'DESC']]
    });
    return sendSuccess(res, tickets);
  } catch (err) {
    return sendError(res, 'Destek kuyruğu alınamadı', 500);
  }
});

router.patch('/admin/tickets/:id/status', requireAuth, requireRole('admin', 'gallery_manager'), async (req, res) => {
  const nextStatus = req.body.status;
  if (!['open', 'in_progress', 'resolved', 'closed'].includes(nextStatus)) {
    return sendError(res, 'Geçersiz destek durumu', 400);
  }
  try {
    const ticket = await SupportTicket.findByPk(req.params.id);
    if (!ticket) return sendError(res, 'Talep bulunamadı', 404);
    const transitions = {
      open: ['in_progress', 'closed'],
      in_progress: ['resolved', 'closed'],
      resolved: ['in_progress', 'closed'],
      closed: ['in_progress']
    };
    if (!transitions[ticket.status].includes(nextStatus)) {
      return sendError(res, 'Geçersiz destek durumu geçişi', 409);
    }
    const [updated] = await SupportTicket.update({ status: nextStatus }, {
      where: { ticket_id: ticket.ticket_id, status: ticket.status }
    });
    if (updated !== 1) return sendError(res, 'Talep durumu başka işlemle değişti', 409);
    return sendSuccess(res, { ticket_id: ticket.ticket_id, status: nextStatus }, 'Destek talebi güncellendi');
  } catch (err) {
    return sendError(res, 'Talep güncellenemedi', 500);
  }
});

module.exports = router;
