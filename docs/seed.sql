-- =====================================================
-- Seed Data — Örnek Veriler
-- =====================================================

-- Kullanıcılar (şifre: password123, bcrypt hash)
INSERT INTO users (username, email, password_hash, full_name, phone, role) VALUES
('admin', 'admin@gallery.com', '$2a$12$LJ3mFGLPwQ5z5Z5Z5Z5Z5e', 'Admin Kullanıcı', '05551234567', 'admin'),
('manager1', 'manager@gallery.com', '$2a$12$LJ3mFGLPwQ5z5Z5Z5Z5Z5e', 'Galeri Yöneticisi', '05559876543', 'gallery_manager'),
('ahmet', 'ahmet@email.com', '$2a$12$LJ3mFGLPwQ5z5Z5Z5Z5Z5e', 'Ahmet Yılmaz', '05551112233', 'customer'),
('ayse', 'ayse@email.com', '$2a$12$LJ3mFGLPwQ5z5Z5Z5Z5Z5e', 'Ayşe Kaya', '05554445566', 'customer'),
('mehmet', 'mehmet@email.com', '$2a$12$LJ3mFGLPwQ5z5Z5Z5Z5Z5e', 'Mehmet Demir', '05557778899', 'customer'),
('zeynep', 'zeynep@email.com', '$2a$12$LJ3mFGLPwQ5z5Z5Z5Z5Z5e', 'Zeynep Açık', '05553334455', 'customer');

-- Sanatçılar
INSERT INTO artists (name, bio, website) VALUES
('Elif Şahin', 'Soyut resim ve dijital sanat alanında eserler veren modern sanatçı.', 'https://elifsahin.art'),
('Can Özdemir', 'Doğa ve peyzaj konularında yağlı boya tablo üreten ödüllü sanatçı.', 'https://canozdemir.com'),
('Seda Arslan', 'Heykel ve seramik sanatçısı.', NULL),
('Burak Yıldız', 'Fotoğraf sanatçısı. Sokak fotoğrafçılığı uzmanı.', 'https://burakyildiz.photo'),
('Deniz Acar', 'Suluboya ve karakalem tekniklerinde uzmanlaşmış genç sanatçı.', NULL);

-- Kategoriler
INSERT INTO categories (name, description) VALUES
('Yağlı Boya', 'Tuval üzerine yağlı boya tablolar'),
('Suluboya', 'Suluboya tekniği ile yapılmış eserler'),
('Dijital Sanat', 'Dijital ortamda üretilmiş sanat eserleri'),
('Heykel', 'Üç boyutlu sanat eserleri'),
('Fotoğraf', 'Sanat fotoğrafları'),
('Karakalem', 'Karakalem çizim teknikleri');

-- Eserler
INSERT INTO artworks (title, description, artist_id, category_id, price, stock_quantity, view_count) VALUES
('Mavi Rüya', 'Soyut mavi tonlarda tuval üzerine yağlı boya.', 1, 1, 4500.00, 1, 120),
('Kapadokya Gün Batımı', 'Kapadokya manzarası, yağlı boya.', 2, 1, 7800.00, 1, 340),
('Dijital Senfoni', 'Müzikten ilham alan dijital soyut eser.', 1, 3, 2200.00, 5, 89),
('Anadolu Vazosu', 'Geleneksel Anadolu motifli seramik vazo.', 3, 4, 3500.00, 3, 56),
('İstanbul Sokakları', 'Beyoğlu sokaklarından siyah-beyaz fotoğraflar.', 4, 5, 1800.00, 10, 210),
('Bahar Çiçekleri', 'Suluboya tekniği ile bahar çiçekleri.', 5, 2, 1500.00, 2, 78),
('Göl Kenarı', 'Sakin bir göl manzarası, karakalem.', 5, 6, 900.00, 4, 45),
('Neon Gece', 'Neon ışıklar altında şehir silueti, dijital sanat.', 1, 3, 3200.00, 3, 156);

-- Etkinlikler
INSERT INTO events (title, description, event_date, event_time, duration_minutes, capacity, current_registrations, price, location, organizer_id) VALUES
('Yağlı Boya Atölyesi: Başlangıç', 'Yağlı boya tekniklerini öğrenin.', '2026-04-15', '10:00', 180, 20, 12, 350.00, 'Galeri Merkez Stüdyo, İstanbul', 2),
('Dijital İllüstrasyon Workshop', 'iPad ile dijital çizim.', '2026-04-20', '14:00', 120, 15, 8, 250.00, 'Online (Zoom)', 2),
('Fotoğrafçılık Gezisi', 'İstanbul tarihi yarımadasında fotoğraf gezisi.', '2026-05-01', '09:00', 240, 25, 18, 200.00, 'Sultanahmet, İstanbul', 2),
('Seramik Atölyesi', 'Geleneksel seramik teknikleri.', '2026-05-10', '11:00', 150, 12, 5, 400.00, 'Galeri Merkez Stüdyo, İstanbul', 2),
('Sanat Tarihi Söyleşisi', 'Modern Türk sanatının 100 yılı.', '2026-05-15', '18:00', 90, 50, 32, 0.00, 'Konferans Salonu, İstanbul', 2),
('Karakalem Portre Kursu', 'Yüz anatomisi ve portre çizim.', '2026-06-01', '10:00', 180, 15, 3, 300.00, 'Galeri Merkez Stüdyo, İstanbul', 2);

-- Kuponlar
INSERT INTO coupons (code, discount_percent, discount_amount, valid_from, valid_until, max_uses, used_count, is_user_specific) VALUES
('HOSGELDIN10', 10, NULL, '2026-01-01', '2026-12-31', 100, 15, FALSE),
('SANAT20', 20, NULL, '2026-03-01', '2026-06-30', 50, 8, FALSE),
('VIP50', NULL, 50, '2026-01-01', '2026-12-31', 10, 2, FALSE),
('BAHAR30', 30, NULL, '2026-04-01', '2026-05-31', 200, 0, FALSE);

-- Rezervasyonlar
INSERT INTO reservations (user_id, event_id, participant_count, reservation_date, reservation_time, status) VALUES
(3, 1, 1, '2026-04-15', '10:00', 'confirmed'),
(4, 1, 2, '2026-04-15', '10:00', 'confirmed'),
(3, 2, 1, '2026-04-20', '14:00', 'pending'),
(5, 3, 3, '2026-05-01', '09:00', 'confirmed'),
(6, 4, 1, '2026-05-10', '11:00', 'confirmed');

-- Siparişler
INSERT INTO orders (user_id, total_amount, status, payment_method, discount_amount) VALUES
(3, 4500.00, 'delivered', 'credit_card', 0),
(4, 3500.00, 'paid', 'bank_transfer', 0),
(5, 1800.00, 'delivered', 'paypal', 0),
(6, 1350.00, 'shipped', 'credit_card', 150),
(3, 3200.00, 'delivered', 'credit_card', 0);

-- Sipariş Kalemleri
INSERT INTO order_items (order_id, artwork_id, quantity, unit_price) VALUES
(1, 1, 1, 4500.00),
(2, 4, 1, 3500.00),
(3, 5, 1, 1800.00),
(4, 6, 1, 1500.00),
(5, 8, 1, 3200.00);

-- Favoriler
INSERT INTO favorites (user_id, artwork_id) VALUES
(3, 2), (3, 5), (4, 1), (4, 3), (5, 2), (5, 8), (6, 1), (6, 7);

-- Yorumlar
INSERT INTO reviews (user_id, artwork_id, event_id, rating, comment, is_verified) VALUES
(3, 1, NULL, 5, 'Muhteşem bir eser! Renk kullanımı çok etkileyici.', TRUE),
(5, 5, NULL, 4, 'Fotoğraflar çok atmosferik, çerçevelettirip astım.', TRUE),
(3, NULL, 1, 5, 'Harika bir atölye deneyimiydi.', TRUE),
(4, NULL, 1, 4, 'Eğitmen çok iyiydi, mekan biraz kalabalıktı.', TRUE),
(5, NULL, 3, 5, 'İstanbul tarihi güzelliklerini fotoğraflamak harikaydı.', TRUE),
(3, 8, NULL, 4, 'Dijital sanatın güzel bir örneği.', TRUE);

-- Yorum Oyları
INSERT INTO review_votes (review_id, user_id, is_helpful) VALUES
(1, 4, TRUE), (1, 5, TRUE), (2, 3, TRUE), (3, 4, TRUE), (3, 5, FALSE);

-- Yorum Yanıtları
INSERT INTO review_replies (review_id, replier_id, reply_text) VALUES
(1, 1, 'Güzel değerlendirmeniz için teşekkür ederiz!'),
(3, 2, 'Atölyemize katıldığınız için teşekkürler!'),
(4, 2, 'Geri bildiriminiz için teşekkürler, iyileştireceğiz.');

-- Destek Talepleri
INSERT INTO support_tickets (user_id, subject, message, status) VALUES
(3, 'Sipariş kargo takibi', 'Siparişim ne zaman kargoya verilecek?', 'resolved'),
(4, 'Eser iadesi', 'Tablonun çerçevesinde bir sorun var.', 'in_progress'),
(5, 'Etkinlik saati değişikliği', 'Fotoğraf gezisinin saati değişti mi?', 'open'),
(6, 'Ödeme sorunu', 'Kredi kartından çekim yapılamadı.', 'open'),
(3, 'Kupon kodu çalışmıyor', 'HOSGELDIN10 kodu uygulanamıyor.', 'closed');
