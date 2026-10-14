const jwt = require('jsonwebtoken');
const { User, Order, OrderItem, Reservation } = require('../models');

// Secrets must be supplied by the environment. Never allow a known fallback key.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || Buffer.byteLength(JWT_SECRET, 'utf8') < 32) {
  throw new Error('JWT_SECRET must be set to a random value of at least 32 bytes before starting the API');
}

// A signed token identifies the user; the database is the source of truth
// for the account's active status and current role on every protected request.
async function resolveIdentity(header) {
  const token = header.slice('Bearer '.length).trim();
  const claims = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
  if (!claims || !Number.isSafeInteger(claims.id) || claims.id < 1) return null;

  const account = await User.findByPk(claims.id, {
    attributes: ['user_id', 'role', 'is_active']
  });
  if (!account || !account.is_active) return null;

  return { id: account.user_id, role: account.role };
}

function isTokenError(err) {
  return err instanceof jwt.JsonWebTokenError;
}

// Required authentication: reject invalid, deleted and deactivated users.
async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Kimlik doğrulama gerekli' });
  }

  try {
    const identity = await resolveIdentity(header);
    if (!identity) {
      return res.status(401).json({ error: 'Geçersiz veya pasifleştirilmiş kullanıcı hesabı' });
    }
    req.user = identity;
    return next();
  } catch (err) {
    if (isTokenError(err)) {
      return res.status(401).json({ error: 'Geçersiz veya süresi dolmuş token' });
    }
    return next(err);
  }
}

// Public routes remain public even when a stale token is present; a stale
// token never grants a user identity. Database failures still surface as errors.
async function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return next();

  try {
    const identity = await resolveIdentity(header);
    if (identity) req.user = identity;
    return next();
  } catch (err) {
    if (isTokenError(err)) return next();
    return next(err);
  }
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
