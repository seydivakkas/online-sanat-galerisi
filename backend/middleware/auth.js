const jwt = require('jsonwebtoken');
const { User, Order, OrderItem, Reservation } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'art-gallery-secret-key-2024';

// JWT doğrulama
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Kimlik doğrulama gerekli' });
  }
  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Geçersiz veya süresi dolmuş token' });
  }
}

// Opsiyonel auth — token varsa decode et, yoksa devam
function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(header.split(' ')[1], JWT_SECRET);
    } catch { /* token geçersiz, devam */ }
  }
  next();
}

// Rol kontrolü
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
    }
    next();
  };
}

// Satın alma kontrolü — yorum yazmadan önce
async function requirePurchase(req, res, next) {
  const { artwork_id } = req.body;
  if (!artwork_id) return next();

  const order = await Order.findOne({
    where: { user_id: req.user.id, status: 'delivered' },
    include: [{
      model: OrderItem,
      as: 'items',
      where: { artwork_id },
      required: true
    }]
  });

  if (!order) {
    return res.status(403).json({
      error: 'Bu esere yorum yapabilmek için satın almış olmanız gerekir'
    });
  }
  next();
}

// Katılım kontrolü — etkinlik yorumu yazmadan önce
async function requireAttendance(req, res, next) {
  const { event_id } = req.body;
  if (!event_id) return next();

  const reservation = await Reservation.findOne({
    where: {
      user_id: req.user.id,
      event_id,
      status: 'confirmed'
    }
  });

  if (!reservation) {
    return res.status(403).json({
      error: 'Bu etkinliğe yorum yapabilmek için katılmış olmanız gerekir'
    });
  }
  next();
}

module.exports = {
  requireAuth,
  optionalAuth,
  requireRole,
  requirePurchase,
  requireAttendance,
  JWT_SECRET
};
