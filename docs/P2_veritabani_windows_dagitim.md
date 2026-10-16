# P2 — Güvenli veritabanı ve Windows yerel dağıtımı

> **Güncel güvenlik durumu (14 Ekim 2026):** Bağımlılık Issue #2 kapatıldı. Express 4.22.1, Sequelize 6.37.8, sqlite3 6.0.1, uuid 11.1.1 ve qs 6.16.0 doğrulanmış npm lockfile içinde; üretim `npm audit --omit=dev --audit-level=low` **0 bulgu** ve 55/55 test PASS. Aşağıdaki eski audit FAIL kayıtları önceki CI çalışmaları için tarihsel kanıttır. PR'lar Draft/HOLD: stacked dal birleştirme sorunu Issue #11, gerçek migration/Windows/finansal kabul Issue #6 açık.

**Durum: Draft/HOLD — PR #8**, P1.3 (#7) tabanlıdır. Master değiştirilmedi.

## Geliştirilen yapı

- Windows yerel mod: tek Node.js sunucusu ve önceden derlenmiş React, http://127.0.0.1:3001, SQLite; zorunlu ücretli API yok. İlk npm kurulumu internet gerektirebilir.
- Veri yolu: %LOCALAPPDATA%/ArtGallery/art-gallery.sqlite; kalıcı ve rastgele üretilmiş JWT anahtarı: %LOCALAPPDATA%/ArtGallery/jwt-secret.txt.
- Geliştirme sunucusu: Vite proxy; dağıtımda React ve Express aynı origin.
- SQLite geçişi: backend/migrations/runner.js; --plan, --apply ve boş yeni DB için --apply --init-empty. SQLite VACUUM INTO ile atomik yedek; eski sipariş, rezervasyon ve audit kayıtları korunur.
- Eski şemaya eklenen alanlar: orders.expires_at, reservations.order_id ve order_status_audits.actor_id nullable.
- Seed: force:true kaldırıldı. Yalnızca boş geliştirme DB üzerinde NODE_ENV=development, ALLOW_DEMO_SEED=YES ve --demo ile kullanılabilir. Seed içindeki biyografiler sentetik demo bilgileridir, doğrulanmış gerçek sanatçı bilgisi değildir.
- Üretim PostgreSQL için DB_NAME, DB_USER, DB_PASS, DB_HOST ortam değişkenleri zorunlu; varsayılan parola yok. pg sürücüsü ve gerçek PostgreSQL kabulü eksik; üretim PostgreSQL HOLD.
- .gitignore çalışma veritabanı, yedek, node_modules ve sırları kapsamaktadır, fakat geçmişte commit edilmiş dosyaları Git geçmişinden kaldırmaz.

## Windows komutları

1. İlk kurulum: powershell -NoProfile -File .\deployment\Install-Windows.ps1
2. Yeni yerel başlatma: powershell -NoProfile -File .\deployment\Start-Local.ps1
3. Eski veritabanı şema geçişi (uygulama kapalıyken): powershell -NoProfile -File .\deployment\Migrate-Database.ps1
4. Backend komutları: npm run db:plan / npm run db:migrate / npm run db:init-empty.
5. Demo seed komutu: geliştirme ortamında ALLOW_DEMO_SEED=YES ayarlanmışken node seed.js --demo.

Eski backend/database.sqlite dosyası otomatik taşınmaz veya üzerine yazılmaz. Uygulama tamamen kapalıyken mevcut veriyi kendiniz yedekleyip veri dizinine aktarmak ve ardından migration uygulamak gerekir. Bu paket bir Windows EXE/MSI değildir; PowerShell ile yerel uygulama başlatıcıları içerir.

## Doğrulama (14 Ekim 2026)

GitHub Actions #38557376900: P0.1 10/10, P0.2 11/11, P1 17/17, P1.3 14/14, P2 migration 3/3 PASS; React build PASS.

Genel npm audit FAIL: 18 bulgu (2 kritik, 9 yüksek dahil). Gerçek Windows 10/11, PostgreSQL, şema geri yükleme ve müşteri kabulü henüz yapılmadı. Issue #2 ve Issue #6 çözülmeden üretime çıkış yok.

**P3 kapsamı:** gerçek Windows kurulum ve veri sürekliliği kabulü, bağımsız güvenlik taraması, PostgreSQL concurrency, finansal mutabakat ve belgelenmiş rollback.

**Karar:** P2 özellikleri kodlandı ve sentetik olarak doğrulandı; üretim kabulü yapılmadı.
