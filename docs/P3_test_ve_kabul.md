# P3 — Son Test ve Kullanıcı Kabul Planı

> **Güncel güvenlik durumu (14 Ekim 2026):** Bağımlılık Issue #2 kapatıldı. Express 4.22.1, Sequelize 6.37.8, sqlite3 6.0.1, uuid 11.1.1 ve qs 6.16.0 doğrulanmış npm lockfile içinde; üretim `npm audit --omit=dev --audit-level=low` **0 bulgu** ve 55/55 test PASS. Aşağıdaki eski audit FAIL kayıtları önceki CI çalışmaları için tarihsel kanıttır. PR'lar Draft/HOLD: stacked dal birleştirme sorunu Issue #11, gerçek migration/Windows/finansal kabul Issue #6 açık.

Durum: **Ön kabul ve CI geliştirmesi**. Bu aşama P2 üzerine kuruludur. Önceki PR #1, #4, #5, #7, #8 henüz ana dala alınmamıştır.

## Mevcut otomatik kontroller

| Grup | Kapsam | Kanıt |
|---|---|---|
| P0.1 | JWT, rol, dosya yükleme | 10/10 GitHub Actions PASS |
| P0.2 | Sahte ödeme önleme, banka referansı, audit | 11/11 PASS |
| P1 | Etkinlik, tarih, koltuk/stok, süre aşımı, iade, yarış | 17/17 PASS |
| P1.3 | Sanatçı, kategori, destek yetkileri, kayıt koruma | 14/14 PASS |
| P2 | SQLite eski şema, backup, kalıcı kayıtlar, idempotency | 3/3 PASS |
| P3 Windows | Node.js 22/npm ci, React derleme, PowerShell, API, SQLite ve JWT secret | GitHub Actions #38558088839 PASS |
| Güvenlik audit | Production bağımlılıklar | FAIL, 18 açık bulgu |

## Gerçek kullanıcı kabulünde yapılacaklar

- [ ] Windows 10 ve Windows 11 gerçek cihazlarında birinci kurulum, tekrar açma, kaldırma ve veri koruma.
- [ ] Var olan SQLite kaydını yedekleme, P2 migration, eski kayıt mutabakatı, geri yükleme/rollback.
- [ ] Admin, gallery_manager ve customer rollerinde giriş, pasifleştirme, eser görsel yükleme ve yetkisiz erişim senaryoları.
- [ ] Sanatçı ve kategori create/edit/retire, destek talebini yanıtla/yeniden aç, sipariş ve kupon yönetimi.
- [ ] Gerçek görsel dosyaları ile 5MB sınır, beklenmedik MIME, uygunsuz içerik ve kesilen yükleme senaryoları.
- [ ] Ücretsiz/ücretli etkinlik, tarih-saat, tek/çoklu koltuk, eşzamanlı son koltuk ve son sanat eseri.
- [ ] Sipariş bekleme süresi, ödeme kanıtı gecikmesi, iptal, gerçek banka tahsilat/iade işlemleri ve yanlış mutabakat.
- [ ] PostgreSQL sürücü/lockfile ve çok worker transaction testi (PostgreSQL üretim HOLD).
- [ ] Windows dosya izni, JWT secret kalıcılığı, yedekten dönüş, offline yeniden başlatma, firewall/HTTPS gereksinimleri.
- [ ] Dependency Issue #2 ve legacy data Issue #6 çözülmeden release yok.
- [ ] Git geçmişindeki daha önce commit edilmiş SQLite ve node_modules için güvenli temizleme ve gerekiyorsa secret rotasyonu.

## Release kapısı

Linux sentetik ve Windows runner kontrolleri PASS oldu; ancak CI tek başına üretim kabulü değildir. Bağımlılık ve gerçek cihaz engelleri giderilmeden release yok. Bağımlılık güvenlik bulguları, gerçek veritabanı şema geçişi veya finansal mutabakat belirsizse karar HOLD. Sentetik CI testlerini üretim finansal kanıtı olarak sunmak yasaktır.

Bu belge üzerinde tamamlanmayan kabul maddeleri sonuç elde edilmeden PASS işaretlenmeyecek. Mevcut değişiklikler Draft PR'da korunur; master değiştirilmez.
