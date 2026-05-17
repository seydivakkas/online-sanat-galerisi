const express = require('express');
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { requireAuth, requireRole } = require('../middleware/auth');
const { sendSuccess, sendError } = require('../utils/response');

const router = express.Router();

// PUT /api/users/profile — Profil güncelle
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { full_name, phone, username } = req.body;
    const user = await User.findByPk(req.user.id);
    if (!user) return sendError(res, 'Kullanıcı bulunamadı', 404);

    if (username && username !== user.username) {
      const exists = await User.findOne({ where: { username } });
      if (exists) return sendError(res, 'Bu kullanıcı adı zaten kullanılıyor', 409);
      user.username = username;
    }
    if (full_name !== undefined) user.full_name = full_name;
    if (phone !== undefined) user.phone = phone;
    await user.save();

    sendSuccess(res, {
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        role: user.role
      }
    }, 'Profil güncellendi');
  } catch (err) {
    sendError(res, 'Profil güncellenirken hata: ' + err.message, 500);
  }
});

// PUT /api/users/password — Şifre değiştir
router.put('/password', requireAuth, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return sendError(res, 'Mevcut ve yeni şifre gerekli', 400);
    }
    if (new_password.length < 6) {
      return sendError(res, 'Yeni şifre en az 6 karakter olmalı', 400);
    }

    const user = await User.findByPk(req.user.id);
    const isMatch = await bcrypt.compare(current_password, user.password_hash);
    if (!isMatch) return sendError(res, 'Mevcut şifre yanlış', 401);

    user.password_hash = await bcrypt.hash(new_password, 12);
    await user.save();

    sendSuccess(res, null, 'Şifre başarıyla değiştirildi');
  } catch (err) {
    sendError(res, 'Şifre değiştirirken hata: ' + err.message, 500);
  }
});

// GET /api/users/profile — Profil bilgisi
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password_hash'] }
    });
    sendSuccess(res, user);
  } catch (err) {
    sendError(res, 'Profil bilgileri alınırken hata', 500);
  }
});

// PATCH /api/users/:id/status — Kullanıcı durumunu güncelle (Admin)
router.patch('/:id/status', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { is_active } = req.body;
    if (typeof is_active !== 'boolean') {
      return sendError(res, 'is_active alanı boolean olmalıdır', 400);
    }

    if (parseInt(req.params.id) === req.user.id) {
       return sendError(res, 'Kendi durumunuzu değiştiremezsiniz', 400);
    }

    const userToUpdate = await User.findByPk(req.params.id);
    if (!userToUpdate) return sendError(res, 'Kullanıcı bulunamadı', 404);

    userToUpdate.is_active = is_active;
    await userToUpdate.save();

    sendSuccess(res, { user: { user_id: userToUpdate.user_id, is_active: userToUpdate.is_active } }, 'Kullanıcı durumu güncellendi');
  } catch (err) {
    sendError(res, 'Durum güncellenirken hata: ' + err.message, 500);
  }
});

module.exports = router;
