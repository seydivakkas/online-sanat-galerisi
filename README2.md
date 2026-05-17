# 🎨 Online Sanat Galerisi ve Atölye Rezervasyon Sistemi

> Tam kapsamlı (full-stack) sanat galerisi platformu. Eser satışı, etkinlik rezervasyonu, yorum sistemi, kupon yönetimi ve admin paneli içerir.

## Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| **Backend** | Node.js, Express.js, Sequelize ORM, SQLite |
| **Frontend** | React 18, Vite, React Router, Axios |
| **Auth** | JWT (jsonwebtoken), bcryptjs (salt=12) |
| **Validasyon** | express-validator |
| **UI** | Bootstrap 5, react-hot-toast |
| **Grafikler** | Chart.js, react-chartjs-2 |

---

## Sistem Mimarisi

```mermaid
graph TB
    subgraph "Frontend - React + Vite :5173"
        UI["🖥️ React UI"]
        AR["AuthContext"]
        CR["CartContext"]
        API_SVC["api.js (Axios)"]
        PR["ProtectedRoute"]
        UI --> AR
        UI --> CR
        UI --> API_SVC
        UI --> PR
    end

    subgraph "Backend - Express :3001"
        SRV["server.js"]
        MW["Middleware"]
        RT["Routes (13)"]
        MDL["Models (16)"]
        DB["SQLite"]
        SRV --> MW
        SRV --> RT
        RT --> MDL
        MDL --> DB
    end

    API_SVC -- "HTTP/JSON + JWT" --> SRV
```

---

## Proje Dizin Yapısı

```
myproje1/
├── backend/
│   ├── config/
│   │   └── database.js          # Sequelize SQLite bağlantısı
│   ├── middleware/
│   │   ├── auth.js              # JWT, rol kontrolü, satın alma/katılım doğrulama
│   │   └── validate.js          # express-validator kuralları
│   ├── models/
│   │   ├── index.js             # Tüm model ilişkileri (associations)
│   │   ├── User.js              # Kullanıcı modeli
│   │   ├── Artist.js            # Sanatçı modeli
│   │   ├── Category.js          # Kategori modeli
│   │   ├── Artwork.js           # Eser modeli
│   │   ├── ArtworkImage.js      # Eser görselleri
│   │   ├── Event.js             # Etkinlik modeli
│   │   ├── Reservation.js       # Rezervasyon modeli
│   │   ├── Order.js             # Sipariş modeli
│   │   ├── OrderItem.js         # Sipariş kalemi (polimorfik)
│   │   ├── Favorite.js          # Favoriler
│   │   ├── Review.js            # Yorumlar
│   │   ├── ReviewVote.js        # Yorum oyları
│   │   ├── ReviewReply.js       # Yorum yanıtları
│   │   ├── Coupon.js            # İndirim kuponları
│   │   ├── SupportTicket.js     # Destek talepleri
│   │   ├── SupportMessage.js    # Destek mesajları
│   │   └── Comparison.js        # Karşılaştırmalar
│   ├── routes/
│   │   ├── auth.js              # POST register, login
│   │   ├── users.js             # GET/PUT profile, password
│   │   ├── artworks.js          # CRUD + reviews + avg-rating
│   │   ├── artists.js           # GET list + categories
│   │   ├── events.js            # GET list + detail
│   │   ├── favorites.js         # GET/POST/DELETE
│   │   ├── reservations.js      # CRUD + iptal
│   │   ├── orders.js            # POST create + confirm
│   │   ├── reviews.js           # POST + vote + reply + status
│   │   ├── coupons.js           # GET validate + my-offers
│   │   ├── support.js           # Ticket + mesajlaşma
│   │   ├── compare.js           # Eser/etkinlik karşılaştırma + kaydet
│   │   └── admin.js             # Raporlar + CRUD yönetim
│   ├── utils/
│   │   └── response.js          # sendSuccess / sendError helper
│   ├── server.js                # Express app + middleware + sync
│   ├── seed.js                  # Örnek veri (10 kullanıcı, 25 eser, 10 etkinlik)
│   └── database.sqlite          # Veritabanı dosyası
│
├── frontend/
│   ├── src/
│   │   ├── context/
│   │   │   ├── AuthContext.jsx   # JWT token + user state
│   │   │   └── CartContext.jsx   # Sepet yönetimi (localStorage)
│   │   ├── components/
│   │   │   ├── Navbar.jsx        # Navigasyon + rol bazlı menü
│   │   │   └── ProtectedRoute.jsx # Auth + rol guard
│   │   ├── pages/
│   │   │   ├── HomePage.jsx      # Öne çıkan eserler + etkinlikler
│   │   │   ├── Login.jsx         # Giriş formu
│   │   │   ├── Register.jsx      # Kayıt formu
│   │   │   ├── ArtworkList.jsx   # Eser galerisi + filtreler
│   │   │   ├── ArtworkDetail.jsx # Eser detay + yorumlar
│   │   │   ├── EventList.jsx     # Etkinlik listesi + doluluk
│   │   │   ├── EventDetail.jsx   # Etkinlik detay + rezervasyon
│   │   │   ├── Favorites.jsx     # Favori listesi
│   │   │   ├── Reservations.jsx  # Rezervasyon yönetimi
│   │   │   ├── Checkout.jsx      # Sepet + ödeme + kupon
│   │   │   ├── Orders.jsx        # Sipariş geçmişi
│   │   │   ├── Compare.jsx       # Karşılaştırma tablosu
│   │   │   ├── Support.jsx       # Destek ticket + mesajlaşma
│   │   │   ├── Profile.jsx       # Profil + şifre değiştirme
│   │   │   └── AdminDashboard.jsx # Yönetim paneli (7 sekme)
│   │   ├── services/
│   │   │   └── api.js            # Axios instance + interceptors
│   │   ├── App.jsx               # Route tanımları
│   │   └── main.jsx              # React root
│   └── package.json
└── README2.md
```

---

## Veritabanı ER Diyagramı

### Tam Veritabanı ER Diyagramı (16 Tablo — Tüm Alanlar)

```mermaid
erDiagram
    User ||--o{ Order : "siparis verir"
    User ||--o{ Reservation : "rezervasyon yapar"
    User ||--o{ Favorite : "favoriye ekler"
    User ||--o{ Review : "yorum yazar"
    User ||--o{ ReviewVote : "oy verir"
    User ||--o{ ReviewReply : "yanit verir"
    User ||--o{ SupportTicket : "talep olusturur"
    User ||--o{ SupportMessage : "mesaj gonderir"
    User ||--o{ Comparison : "karsilastirma yapar"
    User ||--o{ Event : "organize eder"
    User ||--o{ Coupon : "ozel kupon"

    Artist ||--o{ Artwork : "eserleri"
    Category ||--o{ Artwork : "kategorisi"
    Artwork ||--o{ ArtworkImage : "gorselleri"
    Artwork ||--o{ Favorite : "favorileri"
    Artwork ||--o{ Review : "yorumlari"
    Artwork ||--o{ OrderItem : "satislari"

    Event ||--o{ Reservation : "kayitlari"
    Event ||--o{ Review : "yorumlari"
    Event ||--o{ OrderItem : "biletleri"

    Order ||--o{ OrderItem : "kalemleri"
    Order }o--|| Coupon : "kupon"

    Review ||--o{ ReviewVote : "oylari"
    Review ||--o{ ReviewReply : "yanitlari"
    SupportTicket ||--o{ SupportMessage : "mesajlari"

    User {
        int user_id PK
        string username UK
        string email UK
        string password_hash
        string full_name
        string phone
        string avatar
        boolean is_active
        enum role "admin-manager-customer"
        datetime created_at
        datetime updated_at
    }

    Artist {
        int artist_id PK
        string name
        text bio
        string profile_image_url
        string contact
        string website
        boolean is_active
        datetime created_at
    }

    Category {
        int category_id PK
        string name UK
        text description
    }

    Artwork {
        int artwork_id PK
        string title
        text description
        int artist_id FK
        int category_id FK
        decimal price
        int stock_quantity
        string image_url
        int view_count
        boolean is_available
        datetime created_at
    }

    ArtworkImage {
        int image_id PK
        int artwork_id FK
        string image_url
        int sort_order
    }

    Event {
        int event_id PK
        string title
        text description
        date event_date
        string event_time
        int duration_minutes
        int capacity
        int current_registrations
        decimal price
        string location
        int organizer_id FK
        boolean is_active
        datetime created_at
    }

    Reservation {
        int reservation_id PK
        int user_id FK
        int event_id FK
        int participant_count
        date reservation_date
        string reservation_time
        enum status "pending-confirmed-cancelled"
        datetime created_at
        datetime updated_at
    }

    Order {
        int order_id PK
        int user_id FK
        decimal total_amount
        enum status "pending-paid-shipped-delivered-cancelled"
        enum payment_method "credit_card-bank_transfer-paypal"
        int coupon_id FK
        decimal discount_amount
        datetime created_at
    }

    OrderItem {
        int id PK
        int order_id FK
        enum item_type "artwork-event"
        int item_id
        int quantity
        decimal unit_price
    }

    Favorite {
        int favorite_id PK
        int user_id FK
        int artwork_id FK
        datetime added_at
    }

    Review {
        int review_id PK
        int user_id FK
        int artwork_id FK
        int event_id FK
        int rating "1 ile 5 arasi"
        text comment
        boolean is_verified
        datetime created_at
    }

    ReviewVote {
        int vote_id PK
        int review_id FK
        int user_id FK
        boolean is_helpful
    }

    ReviewReply {
        int reply_id PK
        int review_id FK
        int replier_id FK
        text reply_text
        datetime created_at
    }

    Coupon {
        int coupon_id PK
        string code UK
        decimal discount_percent
        decimal discount_amount
        date valid_from
        date valid_until
        int max_uses
        int used_count
        boolean is_user_specific
        int target_user_id FK
    }

    SupportTicket {
        int ticket_id PK
        int user_id FK
        string subject
        text message
        enum status "open-in_progress-resolved-closed"
        datetime created_at
    }

    SupportMessage {
        int message_id PK
        int ticket_id FK
        int sender_id FK
        text message_text
        datetime sent_at
    }

    Comparison {
        int comparison_id PK
        int user_id FK
        enum comparison_type "artwork-event"
        text item_ids "JSON array"
        datetime saved_at
    }
```

---

### Alan Gruplari ve Domain Haritasi

```mermaid
graph TB
    subgraph "KIMLIK ve YETKILENDIRME"
        U["User<br/>─────<br/>user_id PK<br/>username UK<br/>email UK<br/>password_hash<br/>role ENUM<br/>is_active"]
    end

    subgraph "URUN KATALOGU"
        AR["Artist<br/>─────<br/>artist_id PK<br/>name<br/>bio<br/>website"]
        CA["Category<br/>─────<br/>category_id PK<br/>name UK"]
        AW["Artwork<br/>─────<br/>artwork_id PK<br/>title, price<br/>stock_quantity<br/>view_count<br/>artist_id FK<br/>category_id FK"]
        AI["ArtworkImage<br/>─────<br/>image_id PK<br/>artwork_id FK<br/>image_url"]
    end

    subgraph "ETKINLIK YONETIMI"
        EV["Event<br/>─────<br/>event_id PK<br/>title, price<br/>capacity<br/>current_registrations<br/>organizer_id FK"]
        RS["Reservation<br/>─────<br/>reservation_id PK<br/>user_id FK<br/>event_id FK<br/>participant_count<br/>status ENUM"]
    end

    subgraph "SATIS ve ODEME"
        OR["Order<br/>─────<br/>order_id PK<br/>user_id FK<br/>total_amount<br/>status ENUM<br/>payment_method<br/>coupon_id FK"]
        OI["OrderItem<br/>─────<br/>id PK<br/>order_id FK<br/>item_type ENUM<br/>item_id<br/>quantity, unit_price"]
        CP["Coupon<br/>─────<br/>coupon_id PK<br/>code UK<br/>discount_percent<br/>max_uses<br/>target_user_id FK"]
    end

    subgraph "YORUM SISTEMI"
        RV["Review<br/>─────<br/>review_id PK<br/>user_id FK<br/>artwork_id FK<br/>event_id FK<br/>rating 1-5<br/>is_verified"]
        VT["ReviewVote<br/>─────<br/>vote_id PK<br/>review_id FK<br/>user_id FK<br/>is_helpful"]
        RP["ReviewReply<br/>─────<br/>reply_id PK<br/>review_id FK<br/>replier_id FK<br/>reply_text"]
    end

    subgraph "DESTEK SISTEMI"
        ST["SupportTicket<br/>─────<br/>ticket_id PK<br/>user_id FK<br/>subject<br/>status ENUM"]
        SM["SupportMessage<br/>─────<br/>message_id PK<br/>ticket_id FK<br/>sender_id FK<br/>message_text"]
    end

    subgraph "KARSILASTIRMA"
        CM["Comparison<br/>─────<br/>comparison_id PK<br/>user_id FK<br/>comparison_type<br/>item_ids JSON"]
        FV["Favorite<br/>─────<br/>favorite_id PK<br/>user_id FK<br/>artwork_id FK"]
    end

    U --> OR & RS & RV & ST & FV & CM
    AR --> AW
    CA --> AW
    AW --> AI & OI & FV & RV
    EV --> RS & OI & RV
    OR --> OI
    CP --> OR
    RV --> VT & RP
    ST --> SM
```

---

### Tablo Iliskileri Ozet Tablosu

| # | Tablo | Tablo Adi | PK | FK Baglantilari | Ozel Kisitlamalar |
|---|-------|-----------|-----|-----------------|-------------------|
| 1 | **User** | users | user_id | — | username UK, email UK |
| 2 | **Artist** | artists | artist_id | — | — |
| 3 | **Category** | categories | category_id | — | name UK |
| 4 | **Artwork** | artworks | artwork_id | artist_id, category_id | — |
| 5 | **ArtworkImage** | artwork_images | image_id | artwork_id | — |
| 6 | **Event** | events | event_id | organizer_id → User | — |
| 7 | **Reservation** | reservations | reservation_id | user_id, event_id | — |
| 8 | **Order** | orders | order_id | user_id, coupon_id | — |
| 9 | **OrderItem** | order_items | id | order_id | Polimorfik: item_type + item_id |
| 10 | **Favorite** | favorites | favorite_id | user_id, artwork_id | UNIQUE(user_id, artwork_id) |
| 11 | **Review** | reviews | review_id | user_id, artwork_id, event_id | En az bir hedef zorunlu |
| 12 | **ReviewVote** | review_votes | vote_id | review_id, user_id | UNIQUE(review_id, user_id) |
| 13 | **ReviewReply** | review_replies | reply_id | review_id, replier_id → User | — |
| 14 | **Coupon** | coupons | coupon_id | target_user_id → User | code UK |
| 15 | **SupportTicket** | support_tickets | ticket_id | user_id | — |
| 16 | **SupportMessage** | support_messages | message_id | ticket_id, sender_id → User | — |
| 17 | **Comparison** | comparisons | comparison_id | user_id | item_ids JSON array |

### Polimorfik Iliski: OrderItem

```mermaid
graph LR
    OI["OrderItem<br/>item_type + item_id"] -->|"item_type = artwork"| AW["Artwork<br/>artwork_id"]
    OI -->|"item_type = event"| EV["Event<br/>event_id"]

    style OI fill:#f9a825,color:#000
    style AW fill:#42a5f5,color:#fff
    style EV fill:#66bb6a,color:#fff
```

> **Not:** `OrderItem` tablosu **polimorfik ilişki** kullanır. `item_type` alanı `'artwork'` veya `'event'` değeri alır ve `item_id` ilgili tablonun PK'sına işaret eder. Sequelize'da `constraints: false` + `scope` ile tanımlanmıştır.

---

## Kullanıcı Akışları

```mermaid
flowchart LR
    subgraph "Kimlik Doğrulama"
        A1[Kayıt Ol] --> A2[Giriş Yap]
        A2 --> A3[JWT Token Al]
        A3 --> A4{Rol?}
        A4 -->|customer| C1[Müşteri Paneli]
        A4 -->|admin| D1[Admin Paneli]
        A4 -->|gallery_manager| D1
    end
```

```mermaid
flowchart TD
    subgraph "Eser Satın Alma Akışı"
        B1["Eser Listesi"] --> B2["Eser Detay"]
        B2 --> B3["Sepete Ekle"]
        B3 --> B4["Checkout"]
        B4 --> B5{"Kupon Var?"}
        B5 -->|Evet| B6["Kupon Doğrula"]
        B6 --> B7["İndirim Uygula"]
        B5 -->|Hayır| B8["Ödeme Yöntemi Seç"]
        B7 --> B8
        B8 --> B9["Sipariş Oluştur"]
        B9 --> B10["Stok Düşür"]
        B9 --> B11["Ödeme Onayla"]
        B11 --> B12["Yorum Yazabilir ✓"]
    end
```

```mermaid
flowchart TD
    subgraph "Etkinlik Rezervasyon Akışı"
        E1["Etkinlik Listesi"] --> E2["Etkinlik Detay"]
        E2 --> E3{"Kontenjan Var?"}
        E3 -->|Evet| E4["Katılımcı + Tarih Seç"]
        E3 -->|Hayır| E5["Doldu Uyarısı"]
        E4 --> E6["Rezervasyon Oluştur"]
        E6 --> E7["Kontenjan Güncelle"]
        E6 --> E8["Onaylandı ✓"]
        E8 --> E9["Yorum Yazabilir ✓"]
        E8 --> E10["İptal Edebilir"]
        E10 --> E11["Kontenjan Geri Arttır"]
    end
```

---

## API Endpoint Haritası

```mermaid
graph LR
    subgraph "Açık Erişim"
        P1["GET /api/artworks"]
        P2["GET /api/artworks/:id"]
        P3["GET /api/events"]
        P4["GET /api/events/:id"]
        P5["GET /api/artists"]
        P6["GET /api/artworks/:id/reviews"]
        P7["GET /api/artworks/:id/avg-rating"]
        P8["GET /api/reviews/:id/replies"]
        P9["POST /api/compare/artworks"]
        P10["POST /api/compare/events"]
        P11["GET /api/coupons/validate"]
    end

    subgraph "Auth Gerekli (JWT)"
        A1["POST /api/favorites"]
        A2["POST /api/reservations"]
        A3["POST /api/orders"]
        A4["POST /api/reviews"]
        A5["POST /api/reviews/:id/vote"]
        A6["POST /api/support/tickets"]
        A7["GET /api/users/profile"]
        A8["PUT /api/users/password"]
        A9["POST /api/compare/save"]
        A10["GET /api/coupons/my-offers"]
    end

    subgraph "Admin/Manager"
        D1["GET /api/admin/reports/summary"]
        D2["GET /api/admin/reports/artworks"]
        D3["GET /api/admin/reports/events"]
        D4["CRUD /api/admin/users"]
        D5["CRUD /api/admin/artworks"]
        D6["CRUD /api/admin/events"]
        D7["CRUD /api/admin/orders"]
        D8["CRUD /api/admin/coupons"]
        D9["POST /api/reviews/:id/replies"]
    end
```

---

## Middleware Zinciri

```mermaid
flowchart LR
    REQ["HTTP İstek"] --> CORS["CORS"]
    CORS --> JSON["JSON Parser"]
    JSON --> ROUTE["Router"]
    ROUTE --> VAL{"Validasyon"}
    VAL -->|Geçersiz| E400["400 Hata"]
    VAL -->|Geçerli| AUTH{"JWT Auth?"}
    AUTH -->|Token Yok| E401["401 Yetkisiz"]
    AUTH -->|Token OK| ROLE{"Rol Kontrolü?"}
    ROLE -->|Yetersiz| E403["403 Yasak"]
    ROLE -->|OK| BIZ["İş Mantığı"]
    BIZ --> DB["Veritabanı"]
    DB --> RES["JSON Yanıt"]
```

---

## Güvenlik Mimarisi

```mermaid
graph TD
    subgraph "5 Katmanlı Güvenlik"
        L1["1. JWT Token Doğrulama"]
        L2["2. Rol Bazlı Yetkilendirme"]
        L3["3. Input Validasyonu"]
        L4["4. İş Kuralı Doğrulama"]
        L5["5. ORM Koruması"]

        L1 --> L2 --> L3 --> L4 --> L5
    end

    L1 -.- D1["Bearer token, 24h süre"]
    L2 -.- D2["admin, gallery_manager, customer"]
    L3 -.- D3["express-validator kuralları"]
    L4 -.- D4["Satın alma/katılım kontrolü, stok, kapasite"]
    L5 -.- D5["Sequelize parameterized queries"]
```

| Güvenlik Özelliği | Uygulama |
|-------------------|----------|
| Şifre Hash | bcryptjs, salt=12 |
| Token | JWT, 24 saat geçerlilik |
| Rol Kontrolü | `requireRole('admin', 'gallery_manager')` |
| Yorum Doğrulama | Satın alma + katılım kontrolü |
| Input Sanitize | `express-validator` trim, isEmail, isInt |
| SQL Injection | Sequelize ORM parameterized queries |
| UNIQUE Kısıtlama | Email, username, favori (409 Conflict) |

---

## Frontend Sayfa Haritası

```mermaid
graph TD
    subgraph "Herkese Açık"
        HOME["/ Ana Sayfa"]
        LOGIN["/login Giriş"]
        REG["/register Kayıt"]
        ART["/artworks Eserler"]
        ARTD["/artworks/:id Detay"]
        EVT["/events Etkinlikler"]
        EVTD["/events/:id Detay"]
    end

    subgraph "Giriş Gerekli (ProtectedRoute)"
        FAV["/favorites Favoriler"]
        RES["/reservations Rezervasyonlar"]
        CHK["/checkout Sepet/Ödeme"]
        ORD["/orders Siparişler"]
        CMP["/compare Karşılaştırma"]
        SUP["/support Destek"]
        PRF["/profile Profil"]
    end

    subgraph "Admin/Manager"
        ADM["/admin Yönetim Paneli"]
    end

    HOME --> ART & EVT
    ART --> ARTD
    EVT --> EVTD
    ARTD --> FAV & CHK
    EVTD --> RES & CHK
    CHK --> ORD
    ADM -.- TAB1["Dashboard"] & TAB2["Kullanıcılar"] & TAB3["Eserler"] & TAB4["Etkinlikler"] & TAB5["Siparişler"] & TAB6["Yorumlar"] & TAB7["Kuponlar"]
```

---

## State Yönetimi

```mermaid
graph LR
    subgraph "AuthContext"
        AT["token"]
        AU["user"]
        AF["login / logout"]
        AR["isAdmin / isManager"]
    end

    subgraph "CartContext"
        CC["cart[]"]
        CA["addToCart"]
        CR2["removeFromCart"]
        CU["updateQuantity"]
        CT["totalAmount"]
    end

    subgraph "localStorage"
        LS1["token"]
        LS2["user"]
        LS3["cart"]
    end

    AT --> LS1
    AU --> LS2
    CC --> LS3
```

---

## Sipariş Yaşam Döngüsü

```mermaid
stateDiagram-v2
    [*] --> pending : Sipariş Oluştur
    pending --> paid : Ödeme Onayla
    paid --> shipped : Kargoya Ver
    shipped --> delivered : Teslim Et
    pending --> cancelled : İptal Et

    note right of pending : Stok düşürüldü
    note right of paid : Ödeme alındı
    note right of delivered : Yorum yazılabilir
```

## Rezervasyon Yaşam Döngüsü

```mermaid
stateDiagram-v2
    [*] --> pending : Rezervasyon Yap
    pending --> confirmed : Onayla
    pending --> cancelled : İptal Et
    confirmed --> cancelled : İptal Et

    note right of pending : Kontenjan ayrıldı
    note right of confirmed : Etkinliğe katılım hakkı
    note right of cancelled : Kontenjan geri açıldı
```

---

## Kurulum ve Çalıştırma

```bash
# 1. Backend
cd backend
npm install
npm run seed    # Örnek veri yükle (10 kullanıcı, 25 eser, 10 etkinlik)
npm run dev     # http://localhost:3001

# 2. Frontend
cd frontend
npm install
npm run dev     # http://localhost:5173
```

## Test Hesapları

| Rol | E-posta | Şifre |
|-----|---------|-------|
| Admin | admin@gallery.com | password123 |
| Manager | manager@gallery.com | password123 |
| Müşteri | ahmet@email.com | password123 |

---

## Yanıt Formatı (Standart)

```json
{
  "success": true,
  "data": { ... },
  "message": "İşlem başarılı"
}
```

```json
{
  "success": false,
  "data": null,
  "message": "Hata açıklaması"
}
```

**HTTP Durum Kodları:** `200` Başarılı, `201` Oluşturuldu, `400` Geçersiz İstek, `401` Yetkisiz, `403` Yasak, `404` Bulunamadı, `409` Çakışma, `500` Sunucu Hatası
