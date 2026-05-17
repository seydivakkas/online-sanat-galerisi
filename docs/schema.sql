-- =====================================================
-- Online Sanat Galerisi ve Atölye Rezervasyon Sistemi
-- Veritabanı Şeması (PostgreSQL)
-- =====================================================

-- 1. users
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    phone VARCHAR(20),
    role VARCHAR(20) DEFAULT 'customer' CHECK (role IN ('customer', 'admin', 'gallery_manager')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP
);

-- 2. artists
CREATE TABLE artists (
    artist_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    bio TEXT,
    profile_image_url VARCHAR(255),
    website VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. categories
CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT
);

-- 4. artworks
CREATE TABLE artworks (
    artwork_id SERIAL PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    artist_id INTEGER REFERENCES artists(artist_id) ON DELETE SET NULL,
    category_id INTEGER REFERENCES categories(category_id) ON DELETE SET NULL,
    price DECIMAL(10,2),
    stock_quantity INTEGER DEFAULT 1,
    image_url VARCHAR(255),
    view_count INTEGER DEFAULT 0,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 5. events
CREATE TABLE events (
    event_id SERIAL PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    event_time TIME NOT NULL,
    duration_minutes INTEGER,
    capacity INTEGER NOT NULL,
    current_registrations INTEGER DEFAULT 0,
    price DECIMAL(10,2),
    location VARCHAR(200),
    organizer_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 6. reservations
CREATE TABLE reservations (
    reservation_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    event_id INTEGER NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
    participant_count INTEGER NOT NULL CHECK (participant_count >= 1),
    reservation_date DATE NOT NULL,
    reservation_time TIME NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP
);

-- 7. orders
CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    total_amount DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'shipped', 'delivered', 'cancelled')),
    payment_method VARCHAR(20) CHECK (payment_method IN ('credit_card', 'bank_transfer', 'paypal')),
    coupon_id INTEGER REFERENCES coupons(coupon_id) ON DELETE SET NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 8. order_items
CREATE TABLE order_items (
    item_id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    artwork_id INTEGER NOT NULL REFERENCES artworks(artwork_id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity >= 1),
    unit_price DECIMAL(10,2)
);

-- 9. favorites
CREATE TABLE favorites (
    favorite_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    artwork_id INTEGER NOT NULL REFERENCES artworks(artwork_id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, artwork_id)
);

-- 10. reviews
CREATE TABLE reviews (
    review_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    artwork_id INTEGER REFERENCES artworks(artwork_id) ON DELETE CASCADE,
    event_id INTEGER REFERENCES events(event_id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    CHECK (artwork_id IS NOT NULL OR event_id IS NOT NULL)
);

-- 11. review_votes
CREATE TABLE review_votes (
    vote_id SERIAL PRIMARY KEY,
    review_id INTEGER NOT NULL REFERENCES reviews(review_id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    is_helpful BOOLEAN NOT NULL,
    UNIQUE(review_id, user_id)
);

-- 12. review_replies
CREATE TABLE review_replies (
    reply_id SERIAL PRIMARY KEY,
    review_id INTEGER NOT NULL REFERENCES reviews(review_id) ON DELETE CASCADE,
    replier_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    reply_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 13. coupons
CREATE TABLE coupons (
    coupon_id SERIAL PRIMARY KEY,
    code VARCHAR(30) UNIQUE NOT NULL,
    discount_percent DECIMAL(5,2),
    discount_amount DECIMAL(10,2),
    valid_from DATE,
    valid_until DATE,
    max_uses INTEGER,
    used_count INTEGER DEFAULT 0,
    is_user_specific BOOLEAN DEFAULT FALSE,
    target_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL
);

-- 14. support_tickets
CREATE TABLE support_tickets (
    ticket_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    subject VARCHAR(200),
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 15. support_messages
CREATE TABLE support_messages (
    message_id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES support_tickets(ticket_id) ON DELETE CASCADE,
    sender_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    message_text TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT NOW()
);

-- 16. comparisons
CREATE TABLE comparisons (
    comparison_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    comparison_type VARCHAR(10) NOT NULL CHECK (comparison_type IN ('artwork', 'event')),
    item_ids INTEGER[] NOT NULL,
    saved_at TIMESTAMP DEFAULT NOW()
);

-- İndeksler
CREATE INDEX idx_artworks_artist ON artworks(artist_id);
CREATE INDEX idx_artworks_category ON artworks(category_id);
CREATE INDEX idx_reservations_user ON reservations(user_id);
CREATE INDEX idx_reservations_event ON reservations(event_id);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_reviews_artwork ON reviews(artwork_id);
CREATE INDEX idx_reviews_event ON reviews(event_id);
CREATE INDEX idx_favorites_user ON favorites(user_id);
