# P0.1 — Kimlik doğrulama, yetkilendirme ve görsel yükleme sertleştirmesi

> **Güncel güvenlik durumu (14 Ekim 2026):** Bağımlılık Issue #2 kapatıldı. Express 4.22.1, Sequelize 6.37.8, sqlite3 6.0.1, uuid 11.1.1 ve qs 6.16.0 doğrulanmış npm lockfile içinde; üretim `npm audit --omit=dev --audit-level=low` **0 bulgu** ve 55/55 test PASS. Aşağıdaki eski audit FAIL kayıtları önceki CI çalışmaları için tarihsel kanıttır. PR'lar Draft/HOLD: stacked dal birleştirme sorunu Issue #11, gerçek migration/Windows/finansal kabul Issue #6 açık.

Durum: **DRAFT / HOLD**. Multer 2.4.0'a yükseltildi, `npm ci` PASS, kritik P0.1 güvenlik smoke testleri 10/10 PASS; ancak genel `npm audit` 18 bulgu nedeniyle FAIL.

## Uygulanan değişiklikler

1. Sabit JWT anahtarı kaldırıldı. Sunucu başlarken `JWT_SECRET` ortam değişkeni zorunlu ve UTF-8 uzunluğu en az 32 bayt olmalı. Anahtar eksik veya kısa ise sunucu başlamaz. Token algoritması HS256 ile sınırlandırıldı.
2. `requireAuth` artık imzalı tokenın `id` alanına göre kullanıcıyı veritabanından yeniden okur. Silinmiş/pasif hesap 401 alır. Yetkiler tokenın eski `role` alanından değil, güncel `users.role` sütunundan gelir.
3. Pasif hesapların yeni oturum açması engellendi. Anonim galeri listeleme herkese açık kalır.
4. `POST /api/artworks` üzerinde admin/manager rol denetimi Multer'dan önce çalışır.
5. Görsel yükleme uzantı + MIME eşleşmesi + dosya imzası üzerinden kontrol edilir. Boyut 5 MB ve tek dosya ile sınırlıdır. Hatalı yüklemeler 400 döner; reddedilen/başarısız işlem dosyaları temizlenmeye çalışılır; rastgele UUID dosya adı kullanılır.
6. `/uploads` statik yanıtlarında `X-Content-Type-Options: nosniff` uygulanır.

## Windows / PowerShell ile başlatma

Terminalde geliştirme amaçlı **rastgele** bir JWT secret üretin. Aşağıdaki değişken yalnızca o PowerShell oturumu için geçerlidir:

```powershell
$bytes = New-Object byte[] 48
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
$env:JWT_SECRET = [Convert]::ToBase64String($bytes)
cd backend
npm run dev
```

Üretimde **kalıcı fakat gizli** bir random secret yapılandırma/secret yönetimiyle aktarılmalıdır; koda, README'ye, Git geçmişine veya depoya koymayın. JWT secret değişirse önceki tokenlar geçersizleşir ve kullanıcıların tekrar giriş yapması gerekir. Kullanıcı arayüzünün güncel hali buna 401 yanıtlarında girişe yönlendirerek karşılık verir.

Örnek veritabanı hazırlama komutu `npm run seed`, `sequelize.sync({force:true})` kullanır ve **mevcut kayıtları siler**. P0.1 ile `NODE_ENV=production` durumunda çalıştırılması engellendi. Eski demo admin/manager hesapları daha önce üretime taşındıysa bunların parolalarını değiştirin veya hesapları devre dışı bırakın.

## P0.1 güvenlik senaryoları — GitHub Actions üzerinde çalıştırıldı (10/10 PASS)

- Ortam secret yok veya 32 bayttan kısa: API başlatılması reddedilmeli.
- Yanlış/bitmiş token ve silinen/pasifleştirilen kullanıcı: korumalı uç noktalarda 401.
- Veritabanında rolü customer'a düşen eski admin tokenı: yönetici uç noktasında 403.
- Aktif customer: eser ekleme/yükleme isteği 403; yükleme dosyası oluşturulmamalı.
- Aktif admin ve gallery_manager: geçerli JPEG/PNG/GIF/WebP ile eser oluşturabilmeli.
- Yanlış imza, uzantı/MIME uyuşmazlığı, >5MB veya çoklu dosya: 400; eser kaydı yapılmamalı.
- Anonim katalog GET ve normal müşteri giriş/favori/rezervasyon akışı regresyon kontrolünden geçmeli.

## Birleştirmeyi engelleyen işler

- **Multer düzeltmesi tamamlandı:** `backend/package.json` + `package-lock.json` Multer `2.4.0` ile uyumlu; GitHub Actions üzerinde `npm ci` ve 10/10 kimlik/görsel testleri başarılı. CVE-2026-88932 için sabitlenen sürüm güvenlik düzeltmesini içeriyor.
- **Bağımlılık güvenlik taraması FAIL:** CI `npm audit --omit=dev --audit-level=high` sonucunda 18 bulgu (2 kritik / 9 yüksek / 4 orta / 3 düşük) döndü. Özellikle `proxy-addr`, `tar`, `sqlite3`→`node-gyp` zinciri, `sequelize`→`uuid` zinciri ve eski Express transitifleri için ayrı uyumluluk/upgrade çalışması gerekiyor. `npm audit fix --force` körlemesine uygulanmamalı; sqlite3 6.0.1 gibi major güncellemeler ayrı test gerektirir. Bu sebeple PR hâlen HOLD.
- GitHub Actions: `P0.1 Security Gate`, run `38526692983`; `npm ci` PASS, `node --test tests/p0-1.test.js` 10/10 PASS, tam bağımlılık audit FAIL. Test dosyası `backend/tests/p0-1.test.js`, runner Node.js 22 ve bellek içi SQLite kullanır. Daha geniş senaryolar (yüklemenin abort edilmesi, dosya dekoder doğrulaması, tüm müşteri akışları ve Windows kabulü) henüz yapılmadı.
- Dosya imzası yalnızca temel biçim doğrulamasıdır; tam resim decoder ile doğrulama / yeniden kodlama, görsel içerik denetimi, istek sınırlandırma ve antivirüs taraması mevcut kapsamda uygulanmadı.
- Üretim ortamı için CORS, HTTPS, güvenli secret yönetimi ve dağıtım yapılandırmaları ayrıca incelenmelidir.

## Kapsam dışı

P0.2 ödeme ve sipariş durum güvenliği; P1 rezervasyon kontenjan bütünlüğü. Bu konulara bu PR dokunmaz.
