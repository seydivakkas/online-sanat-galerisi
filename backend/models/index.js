const sequelize = require('../config/database');
const User = require('./User');
const Artist = require('./Artist');
const Category = require('./Category');
const Artwork = require('./Artwork');
const ArtworkImage = require('./ArtworkImage');
const Event = require('./Event');
const Reservation = require('./Reservation');
const Order = require('./Order');
const OrderItem = require('./OrderItem');
const Favorite = require('./Favorite');
const Review = require('./Review');
const ReviewVote = require('./ReviewVote');
const ReviewReply = require('./ReviewReply');
const Coupon = require('./Coupon');
const SupportTicket = require('./SupportTicket');
const SupportMessage = require('./SupportMessage');
const Comparison = require('./Comparison');

// ── İlişkiler ──

// Artist → Artwork
Artist.hasMany(Artwork, { foreignKey: 'artist_id', as: 'artworks' });
Artwork.belongsTo(Artist, { foreignKey: 'artist_id', as: 'artist' });

// Category → Artwork
Category.hasMany(Artwork, { foreignKey: 'category_id', as: 'artworks' });
Artwork.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });

// User → Event (organizer)
User.hasMany(Event, { foreignKey: 'organizer_id', as: 'organizedEvents' });
Event.belongsTo(User, { foreignKey: 'organizer_id', as: 'organizer' });

// User → Reservation
User.hasMany(Reservation, { foreignKey: 'user_id', as: 'reservations' });
Reservation.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Event → Reservation
Event.hasMany(Reservation, { foreignKey: 'event_id', as: 'reservations' });
Reservation.belongsTo(Event, { foreignKey: 'event_id', as: 'event' });

// User → Order
User.hasMany(Order, { foreignKey: 'user_id', as: 'orders' });
Order.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Order → OrderItem
Order.hasMany(OrderItem, { foreignKey: 'order_id', as: 'items' });
OrderItem.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

// Artwork → ArtworkImage
Artwork.hasMany(ArtworkImage, { foreignKey: 'artwork_id', as: 'images' });
ArtworkImage.belongsTo(Artwork, { foreignKey: 'artwork_id', as: 'artwork' });

// Polymorphic OrderItem → Artwork / Event
Artwork.hasMany(OrderItem, { foreignKey: 'item_id', constraints: false, scope: { item_type: 'artwork' }, as: 'orderItems' });
OrderItem.belongsTo(Artwork, { foreignKey: 'item_id', constraints: false, as: 'artwork' });

Event.hasMany(OrderItem, { foreignKey: 'item_id', constraints: false, scope: { item_type: 'event' }, as: 'ticketOrders' });
OrderItem.belongsTo(Event, { foreignKey: 'item_id', constraints: false, as: 'event' });

// User → Favorite
User.hasMany(Favorite, { foreignKey: 'user_id', as: 'favorites' });
Favorite.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Artwork → Favorite
Artwork.hasMany(Favorite, { foreignKey: 'artwork_id', as: 'favorites' });
Favorite.belongsTo(Artwork, { foreignKey: 'artwork_id', as: 'artwork' });

// User → Review
User.hasMany(Review, { foreignKey: 'user_id', as: 'reviews' });
Review.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Artwork → Review
Artwork.hasMany(Review, { foreignKey: 'artwork_id', as: 'reviews' });
Review.belongsTo(Artwork, { foreignKey: 'artwork_id', as: 'artwork' });

// Event → Review
Event.hasMany(Review, { foreignKey: 'event_id', as: 'reviews' });
Review.belongsTo(Event, { foreignKey: 'event_id', as: 'event' });

// Review → ReviewVote
Review.hasMany(ReviewVote, { foreignKey: 'review_id', as: 'votes' });
ReviewVote.belongsTo(Review, { foreignKey: 'review_id', as: 'review' });
User.hasMany(ReviewVote, { foreignKey: 'user_id', as: 'reviewVotes' });
ReviewVote.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Review → ReviewReply
Review.hasMany(ReviewReply, { foreignKey: 'review_id', as: 'replies' });
ReviewReply.belongsTo(Review, { foreignKey: 'review_id', as: 'review' });
User.hasMany(ReviewReply, { foreignKey: 'replier_id', as: 'reviewReplies' });
ReviewReply.belongsTo(User, { foreignKey: 'replier_id', as: 'replier' });

// Coupon → Order
Coupon.hasMany(Order, { foreignKey: 'coupon_id', as: 'orders' });
Order.belongsTo(Coupon, { foreignKey: 'coupon_id', as: 'coupon' });

// Coupon → User (user-specific)
User.hasMany(Coupon, { foreignKey: 'target_user_id', as: 'personalCoupons' });
Coupon.belongsTo(User, { foreignKey: 'target_user_id', as: 'targetUser' });

// User → SupportTicket
User.hasMany(SupportTicket, { foreignKey: 'user_id', as: 'tickets' });
SupportTicket.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// SupportTicket → SupportMessage
SupportTicket.hasMany(SupportMessage, { foreignKey: 'ticket_id', as: 'messages' });
SupportMessage.belongsTo(SupportTicket, { foreignKey: 'ticket_id', as: 'ticket' });

// User → SupportMessage
User.hasMany(SupportMessage, { foreignKey: 'sender_id', as: 'sentMessages' });
SupportMessage.belongsTo(User, { foreignKey: 'sender_id', as: 'sender' });

// User → Comparison
User.hasMany(Comparison, { foreignKey: 'user_id', as: 'comparisons' });
Comparison.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = {
  sequelize,
  User,
  Artist,
  Category,
  Artwork,
  ArtworkImage,
  Event,
  Reservation,
  Order,
  OrderItem,
  Favorite,
  Review,
  ReviewVote,
  ReviewReply,
  Coupon,
  SupportTicket,
  SupportMessage,
  Comparison
};
