# P1.3 — Yönetici Modülleri (sanatçı, katalog, destek, sipariş, etkinlik, kullanıcı, kupon)

Durum: **Draft / HOLD**. PR #7, P1 dalını hedefler. `master` değiştirilmedi.

## Gerçekleştirilen işlemler

| Modül | Backend uç noktaları | Arayüz |
|---|---|---|
| Sanatçı | GET/POST/PUT/DELETE `/api/admin/artists` | Sanatçılar & Kategoriler sekmesinden oluştur, düzenle, pasifleştir/aktifleştir |
| Kategori | GET/POST/PUT/DELETE `/api/admin/categories` | Oluştur, düzenle, yalnızca kullanımda değilken sil |
| Eser | `/api/artworks` POST (admin/manager), `/api/admin/artworks` PUT/DELETE | Başlık, sanatçı, kategori, fiyat, stok ve görsel yüklemeli eser formu |
| Kullanıcı | GET/PATCH/DELETE `/api/admin/users` | Rol, durum, pasifleştirme; geçmiş bozulmasın diye fiziksel silme kaldırıldı |
| Etkinlik | GET/POST/PUT/DELETE `/api/admin/events` | Oluştur, düzenle, satış durumunu değiştir, geçmişi koruyan kapatma |
| Destek | `/api/support/admin/tickets`, `/api/support/admin/tickets/:id/status`, `/api/support/tickets/:id/messages` | Yönetici destek kuyruğu, talep görüntüleme, yanıt, durum geçişleri |
| Sipariş | P0.2/P1 banka onayı, iade, sipariş audit uç noktaları | Banka mutabakatı, iade, gönderim ve denetim geçmişi |
| Kupon | GET/POST/PUT/DELETE `/api/admin/coupons` | Oluştur, düzenle, kullanılmamış kuponu kaldır |

### Yetkiler
- `admin`: kullanıcı, kupon, ödeme teyidi, banka iadesi dahil tüm yönetici modülleri.
- `gallery_manager`: sanatçı, kategori, eser, etkinlik, destek, sipariş listeleme ve izinli sevkiyat geçişleri.
- `customer`: yönetici API'lerine erişemez, destek için yalnızca kendi talebini okuyup yanıtlayabilir.
- JWT isteklerinde kullanıcının güncel aktiflik ve rolü veritabanından doğrulanır (P0.1).

### Veri koruma
- Yönetici DELETE işlemleri: kullanıcı `is_active=false`; sanatçı `is_active=false`; eser `is_available=false`; etkinlik `is_active=false`.
- Kullanılmış veya siparişlerle bağlı kuponların silinmesi reddedilir.
- Kategoride eser varsa kategori silme engellenir.
- Destek talebi ve ilk mesajı aynı DB işlemiyle yazılır; kapatılan bilete müşteri veya yönetici yanıtı engellenir; yetkili yönetici yeniden açabilir.

### Doğrulanan test kanıtı
14 Ekim 2026, GitHub Actions **#38556075333**:
- P0.1 kimlik/görsel: **10/10 PASS**.
- P0.2 ödeme: **11/11 PASS**.
- P1 rezervasyon/stok: **17/17 PASS**.
- P1.3 yönetici/destek/katalog: **14/14 PASS**.
- React build: **PASS**.
- `npm audit --omit=dev --audit-level=high`: **FAIL** (18 bulgu, 2 kritik, 9 yüksek).

Bu testler bellek içi SQLite ile sentetik veriler üzerindedir; Windows/gerçek veritabanı dağıtım kabulü değildir.

## P2'ye aktarılacaklar
- Üretim migration'ları ve geri dönüş senaryoları; P1 şema değişiklikleri.
- Repo'daki `database.sqlite` ve `node_modules` geçmişi için güvenli dağıtım disiplini.
- Ortam değişkenleri, PostgreSQL sürücüsü, yıkıcı seed'in dev/prod sınırları, Windows kurulumu.
- Bağımlılık güvenliği Issue #2, eski ödemelerin mutabakatı Issue #6.

**Kabul durumu: DRAFT / HOLD.** PR #1, #4, #5 birleştirilmeden ve production güvenliği sağlanmadan #7 merge edilmez.
