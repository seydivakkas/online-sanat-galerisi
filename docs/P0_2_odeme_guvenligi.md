# P0.2 — Sipariş ve ödeme güvenliği (geliştirme paketi)

> **Güncel güvenlik durumu (14 Ekim 2026):** Bağımlılık Issue #2 kapatıldı. Express 4.22.1, Sequelize 6.37.8, sqlite3 6.0.1, uuid 11.1.1 ve qs 6.16.0 doğrulanmış npm lockfile içinde; üretim `npm audit --omit=dev --audit-level=low` **0 bulgu** ve 55/55 test PASS. Aşağıdaki eski audit FAIL kayıtları önceki CI çalışmaları için tarihsel kanıttır. PR'lar Draft/HOLD: stacked dal birleştirme sorunu Issue #11, gerçek migration/Windows/finansal kabul Issue #6 açık.

## Durum

**Geliştirme: ayrı, P0.1 üzerine kurulu dal.** PR merge / üretim dağıtımı henüz onaylanmadı. P0.1 PR #1 genel bağımlılık güvenliği sorunu #2 nedeniyle HOLD.

### Tehdit modeli ve uygulanan karar

Mevcut müşteri `POST /api/orders/:id/confirm` yolundan siparişini ödeme kanıtı olmadan `paid` yapabiliyordu. Yönetici paneli de herhangi bir statüye doğrudan geçişe izin veriyordu. P0.2 bunları fail-closed düzeltir:

1. `POST /api/orders/:id/confirm` daima **410 Gone** döner, sipariş değiştirmez.
2. Kart ve PayPal entegrasyonu yok. Yeni `credit_card` ve `paypal` sipariş talepleri **409** ile engellenir; ödeme yapılmış gibi gösterilmez.
3. Yeni bilet/etkinlik siparişleri de **409** ile geçici engellenir. Sebep: P1 çözülmeden eski akış tahsilat yapılmadan `confirmed` rezervasyon oluşturuyordu. Doğrudan ücretsiz etkinlik rezervasyon API'si bu iş paketinin kapsamında değiştirilmedi.
4. Yeni sanat eseri siparişleri `bank_transfer` yöntemiyle **pending** oluşturulur. Banka kontrolü sonucu otomatik kabul edilmez.
5. `POST /api/admin/orders/:id/verify-bank-transfer` sadece **aktif admin** rolüyle kullanılır. Admin'in **gerçek banka ekstre/panel kaydını dışarıda kontrol edip** işlem referansı (8–80 karakter), tarih, kaynak türü, en az 15 karakterli açıklama ve birebir tutarı beyan etmesi gerekir. `pending -> paid` koşullu güncellemesi ve audit satırı aynı DB transaction'ı içinde yazılır. Tekil banka referansı farklı siparişe tekrar kullanılamaz.
6. `PATCH /api/admin/orders/:id/status`: yalnızca `paid -> shipped -> delivered`; işlem aktörü ve tarih bilgisi aynı transaction içinde audit'e eklenir. `paid`, `cancelled`, geri geçiş veya atlama bu uç noktadan **reddedilir**.
7. `GET /api/admin/orders/:id/audit`: yönetici ve galeri yöneticisi için denetim geçmişi. Müşteri erişemez.
8. React Checkout ve yönetim paneli yeni davranışı açıkça gösterir; serbest statü dropdown kaldırıldı.

### Kritik sınırlama

**Manuel banka mutabakatı = banka sağlayıcısından bağımsız dijital ödeme kanıtı değildir.** Admin'in ekstreden kontrol ettiği tutar, referans ve açıklamasının doğruluğu insan denetimine bağlıdır. Harici banka API'si / doğrulanmış webhook veya banka belgesinin bağımsız doğrulanması uygulanmadı. Kayda kişisel banka hesap bilgileri yerine işlem referansı ve kontrollü not girilmeli.

### Veritabanı

Yeni `order_status_audits` tablosu eklenir:
`audit_id, order_id, actor_id, action, from_status, to_status, payment_reference (UNIQUE), verified_amount, evidence_source, evidence_date, evidence_note, created_at`.

Geliştirme/test ortamında Sequelize `sync()` yeni tabloyu oluşturur. **Üretim veritabanına otomatik migrate politikası henüz yoktur** (P2); eski siparişlerde geçmiş audit yoktur ve geriye dönük doğrulanmış gibi gösterilmeyecektir.

### Bekleyen riskler ve sonraki adımlar

- P0.1 bağımlılık güvenliği için issue #2 ve PR #1 HOLD kalır.
- P1: siparişe bağlı rezervasyon kimliği, doğru tarih/saat, kontenjanın atomik kontrolü, sipariş ödenmediğinde ayrılan stokun süreli bırakılması, iptal/iade, tekrar deneme, eski siparişlerin mutabakatı.
- Eski `paid` siparişlerinin dış ödeme kanıtı otomatik yoktur; güvenilmez geçmiş kayıtlar için ayrı inceleme gerekir.
- Finansal kayıtların erişim denetimi, değiştirilemez harici audit depolama, üretim migration, gerçek banka mutabakatı ve Windows kabulü geliştirmelerin sonunda ele alınmalıdır.
- Kullanıcıdan gelen herhangi bir ödeme bildirimi, dekont ekran görüntüsü veya sahte webhook **asla tek başına `paid` kararı üretmez**.

### İzole güvenlik testleri

```bash
cd backend
npm ci
npm run test:security
npm run test:payments
npm audit --omit=dev --audit-level=high
```

`test:payments` 10 senaryo içerir: eski onay yolu, admin dışı erişim, eksik/mismatched kanıt, işlem referansının tekrar kullanımı, ödeme+audit atomik güncellemesi, geçersiz durum atlaması, sevkiyat durumları, audit erişimi, desteklenmeyen ödeme yöntemleri ve bilet siparişinin bloke edilmesi. Geçerli `JWT_SECRET` kullanılır, `NODE_ENV=test` ile yalnızca **RAM içi SQLite** test edilir.

Kapsamlı gerçek veri kabulü ve finansal entegrasyon **son aşamadır**.
