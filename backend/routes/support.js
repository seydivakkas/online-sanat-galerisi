const express = require('express');
const { SupportTicket, SupportMessage, User } = require('../models');
const { requireAuth } = require('../middleware/auth');
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
    const { subject, message } = req.body;
    const ticket = await SupportTicket.create({
      user_id: req.user.id,
      subject,
      message
    });

    // İlk mesajı da ekle
    await SupportMessage.create({
      ticket_id: ticket.ticket_id,
      sender_id: req.user.id,
      message_text: message
    });

    sendSuccess(res, { ticket }, 'Destek talebi oluşturuldu', 201);
  } catch (err) {
    sendError(res, 'Destek talebi oluşturulurken hata: ' + err.message, 500);
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
      where: { ticket_id: req.params.id, user_id: req.user.id },
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
  try {
    const { message_text } = req.body;
    if (!message_text) return sendError(res, 'Mesaj metni gerekli', 400);

    const ticket = await SupportTicket.findByPk(req.params.id);
    if (!ticket) return sendError(res, 'Talep bulunamadı', 404);

    // Sadece talep sahibi veya admin/manager mesaj gönderebilir
    if (ticket.user_id !== req.user.id && !['admin', 'gallery_manager'].includes(req.user.role)) {
      return sendError(res, 'Bu talebe mesaj gönderme yetkiniz yok', 403);
    }

    const msg = await SupportMessage.create({
      ticket_id: parseInt(req.params.id),
      sender_id: req.user.id,
      message_text
    });

    // Durum güncelle
    if (ticket.status === 'open') {
      ticket.status = 'in_progress';
      await ticket.save();
    }

    sendSuccess(res, msg, 'Mesaj gönderildi', 201);
  } catch (err) {
    sendError(res, 'Mesaj gönderilirken hata: ' + err.message, 500);
  }
});

module.exports = router;
