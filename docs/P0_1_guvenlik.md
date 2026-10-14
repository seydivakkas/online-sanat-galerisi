# P0.1 — Kimlik doğrulama, yetkilendirme ve görsel yükleme sertleştirmesi

Durum: **DRAFT / HOLD**. İşlev değişiklikleri branch üzerinde; üretim güvenliği ve kabulü henüz tamamlanmadı.

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

Örnek veritabanı hazırlama komutu `npm run seed`, `sequelize.sync({force:true})` kullanır ve **mevcut kayıtları siler**. Üretim veritabanında çalıştırmayın.

## Kabul senaryoları (henüz çalıştırılmadı)

- Ortam secret yok veya 32 bayttan kısa: API başlatılması reddedilmeli.
- Yanlış/bitmiş token ve silinen/pasifleştirilen kullanıcı: korumalı uç noktalarda 401.
- Veritabanında rolü customer'a düşen eski admin tokenı: yönetici uç noktasında 403.
- Aktif customer: eser ekleme/yükleme isteği 403; yükleme dosyası oluşturulmamalı.
- Aktif admin ve gallery_manager: geçerli JPEG/PNG/GIF/WebP ile eser oluşturabilmeli.
- Yanlış imza, uzantı/MIME uyuşmazlığı, >5MB veya çoklu dosya: 400; eser kaydı yapılmamalı.
- Anonim katalog GET ve normal müşteri giriş/favori/rezervasyon akışı regresyon kontrolünden geçmeli.

## Birleştirmeyi engelleyen işler

- **Bağımlılık:** `backend/package.json` + `package-lock.json` şu an `multer@^1.4.5-lts.1` kullanıyor. Multer'ın 2026 güvenlik duyuruları nedeniyle **en az 2.4.0'a yükseltilmesi**, lockfile'ın aynı sürüm çözümlemesiyle üretilmesi, `npm ci` ve upload yolunun yeni sürümde doğrulanması zorunlu. Bu adım yapılmadan P0.1 üretim güvenliği kabul edilmez.
- Test altyapısı depoda kanıtlı değil: API entegrasyon, dosya temizliği, hesap pasifleştirme ve rol değişikliği testleri son kabul aşamasında çalıştırılmalıdır.
- Dosya imzası yalnızca temel biçim doğrulamasıdır; tam resim decoder ile doğrulama / yeniden kodlama, görsel içerik denetimi, istek sınırlandırma ve antivirüs taraması mevcut kapsamda uygulanmadı.
- Üretim ortamı için CORS, HTTPS, güvenli secret yönetimi ve dağıtım yapılandırmaları ayrıca incelenmelidir.

## Kapsam dışı

P0.2 ödeme ve sipariş durum güvenliği; P1 rezervasyon kontenjan bütünlüğü. Bu konulara bu PR dokunmaz.
