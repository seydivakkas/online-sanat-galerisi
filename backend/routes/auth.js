const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { registerRules, loginRules } = require('../middleware/validate');
const { requireAuth, JWT_SECRET } = require('../middleware/auth');
const { sendSuccess, sendError } = require('../utils/response');

const router = express.Router();

// POST /api/auth/register — Kayıt
// ┌─ SQL Karşılığı (UNIQUE kontrol + INSERT + bcrypt hash) ──────────────┐
// │ -- 1. E-posta benzersizlik kontrolü (UNIQUE constraint)               │
// │ SELECT * FROM users WHERE email = ?                                   │
// │                                                                       │
// │ -- 2. Kullanıcı adı benzersizlik kontrolü (UNIQUE constraint)          │
// │ SELECT * FROM users WHERE username = ?                                │
// │                                                                       │
// │ -- 3. Şifre hash'leme (bcrypt, salt=12, uygulama katmanı)             │
// │ -- 4. Kayıt oluştur                                                   │
// │ INSERT INTO users (username, email, password_hash, full_name, phone)  │
// │ VALUES (?, ?, '$2a$12$...', ?, ?)                                      │
// └───────────────────────────────────────────────────────────────────────┘
router.post('/register', registerRules, async (req, res) => {
  try {
    const { username, email, password, full_name, phone } = req.body;

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return sendError(res, 'Bu e-posta adresi zaten kayıtlı', 409);
    }

    const existingUsername = await User.findOne({ where: { username } });
    if (existingUsername) {
      return sendError(res, 'Bu kullanıcı adı zaten kullanılıyor', 409);
    }

    const password_hash = await bcrypt.hash(password, 12);
    const user = await User.create({ username, email, password_hash, full_name, phone });

    const token = jwt.sign(
      { id: user.user_id, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    sendSuccess(res, {
      token,
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      }
    }, 'Kayıt başarılı', 201);
  } catch (err) {
    sendError(res, err.message, 500);
  }
});

// POST /api/auth/login — Giriş
// ┌─ SQL Karşılığı (SELECT + bcrypt compare) ────────────────────────────┐
// │ SELECT * FROM users WHERE email = ?                                   │
// │ -- Uygulama katmanında:                                               │
// │ --   bcrypt.compare(input_password, stored_hash)                       │
// │ --   Eşleşirse: JWT token üret (24 saat geçerli)                       │
// │ --   Eşleşmezse: 401 Unauthorized                                     │
// └───────────────────────────────────────────────────────────────────────┘
router.post('/login', loginRules, async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return sendError(res, 'Geçersiz e-posta veya şifre', 401);
    }

    const token = jwt.sign(
      { id: user.user_id, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    sendSuccess(res, {
      token,
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      }
    }, 'Giriş başarılı');
  } catch (err) {
    sendError(res, err.message, 500);
  }
});

module.exports = router;
