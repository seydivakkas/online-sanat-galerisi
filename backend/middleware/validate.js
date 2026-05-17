const { body, param, query, validationResult } = require('express-validator');

// Validasyon sonuçlarını kontrol et
const { sendError } = require('../utils/response');

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, data: { errors: errors.array() }, message: 'Doğrulama hatası' });
  }
  next();
}

// Kayıt validasyonu
const registerRules = [
  body('username').trim().isLength({ min: 3, max: 50 }).withMessage('Kullanıcı adı 3-50 karakter olmalı'),
  body('email').isEmail().normalizeEmail().withMessage('Geçerli bir e-posta adresi girin'),
  body('password').isLength({ min: 6 }).withMessage('Şifre en az 6 karakter olmalı'),
  body('full_name').optional().trim().isLength({ max: 100 }),
  body('phone').optional().trim().isLength({ max: 20 }),
  handleValidation
];

// Giriş validasyonu
const loginRules = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  handleValidation
];

// Rezervasyon validasyonu
const reservationRules = [
  body('event_id').isInt({ min: 1 }),
  body('participant_count').isInt({ min: 1 }).withMessage('Katılımcı sayısı en az 1 olmalı'),
  body('reservation_date').isDate().withMessage('Geçerli bir tarih girin'),
  body('reservation_time').matches(/^\d{2}:\d{2}/).withMessage('Geçerli bir saat girin (HH:MM)'),
  handleValidation
];

// Sipariş validasyonu
const orderRules = [
  body('items').isArray({ min: 1 }).withMessage('En az bir ürün seçmelisiniz'),
  body('items.*.item_type').isIn(['artwork', 'event']).withMessage('Geçerli bir ürün tipi gerekli (artwork/event)'),
  body('items.*.item_id').isInt({ min: 1 }),
  body('items.*.quantity').isInt({ min: 1 }),
  body('payment_method').isIn(['credit_card', 'bank_transfer', 'paypal']),
  body('coupon_code').optional().trim(),
  handleValidation
];

// Yorum validasyonu
const reviewRules = [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Puan 1-5 arasında olmalı'),
  body('comment').optional().trim(),
  handleValidation
];

// Destek talebi validasyonu
const ticketRules = [
  body('subject').trim().isLength({ min: 1, max: 200 }),
  body('message').trim().notEmpty(),
  handleValidation
];

module.exports = {
  handleValidation,
  registerRules,
  loginRules,
  reservationRules,
  orderRules,
  reviewRules,
  ticketRules
};
