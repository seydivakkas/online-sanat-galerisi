# 🎨 Online Sanat Galerisi ve Atölye Rezervasyon Sistemi

Full-stack web uygulaması: sanat eserlerini keşfedin, atölye çalışmalarına katılın, sipariş verin.

## Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| Backend | Node.js + Express |
| ORM | Sequelize |
| Veritabanı | SQLite (dev) / PostgreSQL (prod) |
| Frontend | React (Vite) + Bootstrap 5 |
| Auth | JWT + bcrypt |
| Upload | multer (local) |
| Grafikler | Chart.js |

## Kurulum

### Backend
```bash
cd backend
npm install
npm run seed    # Örnek verileri yükle
npm run dev     # Geliştirme sunucusu (port 3001)
```

### Frontend
```bash
cd frontend
npm install
npm run dev     # Vite dev sunucusu (port 5173)
```

### Test Kullanıcıları
Tüm kullanıcıların şifresi: `password123`

| E-posta | Rol |
|---------|-----|
| admin@gallery.com | admin |
| manager@gallery.com | gallery_manager |
| ahmet@email.com | customer |
| ayse@email.com | customer |
| mehmet@email.com | customer |

---

## API Dokümantasyonu

### 🔐 Kimlik Doğrulama (Auth)

#### POST /api/auth/register
Yeni kullanıcı kaydı.
```json
// Body
{ "username": "john", "email": "john@email.com", "password": "123456", "full_name": "John Doe", "phone": "05551234567" }
// Response 201
{ "message": "Kayıt başarılı", "token": "jwt...", "user": { "user_id": 1, "username": "john", "email": "john@email.com", "role": "customer" } }
```

#### POST /api/auth/login
```json
// Body
{ "email": "ahmet@email.com", "password": "password123" }
// Response 200
{ "message": "Giriş başarılı", "token": "jwt...", "user": {...} }
```

---

### 🖼️ Eserler (Artworks)

#### GET /api/artworks
Eserleri listele. Query params: `page`, `limit`, `category_id`, `artist_id`, `min_price`, `max_price`, `search`
```json
// Response 200
{ "artworks": [...], "pagination": { "total": 8, "page": 1, "totalPages": 1, "limit": 12 } }
```

#### GET /api/artworks/:id
Eser detayı (sanatçı + kategori JOIN, yorumlar, ortalama puan).

#### GET /api/artworks/:id/image
Eser görselini döndür.

#### GET /api/artworks/:id/reviews
Eser yorumlarını listele.

#### GET /api/artworks/:id/avg-rating
Ortalama puan ve yorum sayısı.

---

### 🎨 Sanatçılar (Artists)

#### GET /api/artists
Tüm sanatçıları listele.

#### GET /api/artists/:id
Sanatçı profili ve eserleri.

---

### 📅 Etkinlikler (Events)

#### GET /api/events
Etkinlikleri listele. Query: `filter=upcoming`, `page`, `limit`, `search`

#### GET /api/events/:id
Etkinlik detayı (doluluk, yorumlar, kalan kontenjan).

---

### ❤️ Favoriler (AUTH) 

#### POST /api/favorites
```json
{ "artwork_id": 1 }
// 409: "Bu eser zaten favorilerinizde"
```

#### GET /api/favorites
Favori listesi.

#### DELETE /api/favorites/:artwork_id
Favoriden çıkar.

---

### 🎟️ Rezervasyonlar (AUTH)

#### POST /api/reservations
```json
{ "event_id": 1, "participant_count": 2, "reservation_date": "2026-04-15", "reservation_time": "10:00" }
// 409: Kapasite aşımı veya çakışan rezervasyon
```

#### GET /api/reservations
Kullanıcının rezervasyonları.

#### PUT /api/reservations/:id
Tarih/katılımcı güncelle.

#### DELETE /api/reservations/:id
İptal et (current_registrations geri azalır).

---

### 📦 Siparişler (AUTH)

#### POST /api/orders
```json
{ "items": [{"artwork_id": 1, "quantity": 1}], "payment_method": "credit_card", "coupon_code": "HOSGELDIN10" }
// İş Kuralı: Stok kontrolü + kupon doğrulama + indirim hesaplama
```

#### POST /api/orders/:id/confirm
Ödemeyi onayla.

#### GET /api/orders
Sipariş geçmişi.

#### GET /api/orders/:id
Sipariş detayı.

---

### ⭐ Yorumlar (AUTH)

#### POST /api/reviews
```json
{ "artwork_id": 1, "rating": 5, "comment": "Harika!" }
// 403: Satın alma veya katılım kontrolü
```

#### GET /api/reviews
Query: `sort=newest|highest_rated|most_helpful`

#### POST /api/reviews/:id/vote
```json
{ "is_helpful": true }
// 409: Aynı kullanıcı aynı yoruma 2 kez oy veremez
```

#### POST /api/reviews/:id/replies (ADMIN/MANAGER)
```json
{ "reply_text": "Teşekkürler!" }
```

#### GET /api/reviews/:id/replies

---

### 🎫 Kuponlar

#### GET /api/coupons/validate?code=HOSGELDIN10
Kupon geçerliliği kontrol.

#### GET /api/coupons/my-offers (AUTH)
Kullanıcıya özel fırsatlar.

---

### 📞 Destek (AUTH)

#### POST /api/support/tickets
```json
{ "subject": "Sipariş sorunu", "message": "Detay..." }
```

#### GET /api/support/tickets
#### GET /api/support/tickets/:id
#### POST /api/support/tickets/:id/messages
```json
{ "message_text": "Yanıt mesajı" }
```

---

### ⚖️ Karşılaştırma

#### POST /api/compare/artworks
```json
{ "artwork_ids": [1, 2, 3] }
```

#### POST /api/compare/events
```json
{ "event_ids": [1, 2] }
```

#### POST /api/compare/save (AUTH)
#### GET /api/compare/saved (AUTH)

---

### 👤 Profil (AUTH)

#### GET /api/users/profile
#### PUT /api/users/profile
#### PUT /api/users/password
```json
{ "current_password": "eski", "new_password": "yeni123" }
```

---

### 📊 Admin Raporları (ADMIN)

#### GET /api/admin/reports/artworks
Eser bazlı: yorum sayısı, favori sayısı, view_count, ortalama puan.

#### GET /api/admin/reports/events
Etkinlik bazlı: kapasite, kayıtlı, doluluk oranı, yorum, puan.

#### GET /api/admin/reports/summary
Özet: toplam kullanıcı, sipariş, rezervasyon, gelir, en çok beğenilen 5 eser, en dolu 5 etkinlik.

---

## Güvenlik

- JWT doğrulama (tüm POST/PUT/DELETE)
- bcrypt hash (salt=12)
- Rol tabanlı yetkilendirme (admin, gallery_manager, customer)
- Input validation (express-validator)
- ORM kullanımı (SQL injection koruması)
- Satın alma/katılım doğrulaması (yorum yazma)
- UNIQUE kısıtlamaları (409 Conflict)
- Kapasite kontrolü (409 Conflict)

## Veritabanı

- 16 tablo, tam ilişkisel şema
- ER diyagramı: `docs/er-diagram.md`
- SQL şeması: `docs/schema.sql`
- Seed verileri: `docs/seed.sql`

## Frontend Sayfaları

1. Ana Sayfa — öne çıkan eserler + yaklaşan etkinlikler
2. Eser Listesi — filtre + pagination
3. Eser Detayı — görsel, yorumlar, favori
4. Etkinlik Listesi — doluluk göstergesi
5. Etkinlik Detayı — rezervasyon formu
6. Favorilerim — favori listesi + çıkarma
7. Rezervasyonlarım — durum badge + iptal
8. Siparişlerim — sipariş geçmişi
9. Karşılaştırma — yan yana tablo
10. Destek — ticket + mesajlaşma
11. Profil — bilgi + şifre değiştirme
12. Admin Paneli — Chart.js grafikler
