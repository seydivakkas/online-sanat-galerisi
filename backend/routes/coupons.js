const express = require('express');
const { Op } = require('sequelize');
const { Coupon } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { sendSuccess, sendError } = require('../utils/response');

const router = express.Router();

// GET /api/coupons/validate — Kupon geçerliliği kontrol
// ┌─ SQL Karşılığı ───────────────────────────────────────────────────────┐
// │ SELECT * FROM coupons WHERE code = ?                                   │
// │ -- Uygulama katmanında kontrol:                                        │
// │ --   valid_from <= TODAY AND valid_until >= TODAY                       │
// │ --   used_count < max_uses                                             │
// └───────────────────────────────────────────────────────────────────────┘
router.get('/validate', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return sendError(res, 'Kupon kodu gerekli', 400);

    const coupon = await Coupon.findOne({ where: { code } });
    if (!coupon) return sendSuccess(res, { valid: false }, 'Kupon bulunamadı', 404);

    const today = new Date().toISOString().split('T')[0];
    const isValid =
      (!coupon.valid_from || coupon.valid_from <= today) &&
      (!coupon.valid_until || coupon.valid_until >= today) &&
      (!coupon.max_uses || coupon.used_count < coupon.max_uses);

    sendSuccess(res, {
      valid: isValid,
      coupon: isValid ? {
        code: coupon.code,
        discount_percent: coupon.discount_percent,
        discount_amount: coupon.discount_amount,
        valid_until: coupon.valid_until
      } : null,
      reason: !isValid ? 'Kupon süresi dolmuş veya kullanım limiti aşılmış' : null
    });
  } catch (err) {
    sendError(res, 'Kupon doğrulanırken hata', 500);
  }
});

// GET /api/coupons/my-offers — Kullanıcıya özel fırsatlar
// ┌─ SQL Karşılığı (OR operatörü + tarih filtresi) ───────────────────────┐
// │ SELECT * FROM coupons                                                 │
// │ WHERE (is_user_specific = false OR target_user_id = ?)                │
// │   AND valid_until >= CURRENT_DATE                                      │
// └───────────────────────────────────────────────────────────────────────┘
router.get('/my-offers', requireAuth, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const coupons = await Coupon.findAll({
      where: {
        [Op.or]: [
          { is_user_specific: false },
          { target_user_id: req.user.id }
        ],
        valid_until: { [Op.gte]: today }
      }
    });
    sendSuccess(res, coupons);
  } catch (err) {
    sendError(res, 'Kuponlar listelenirken hata', 500);
  }
});

module.exports = router;
