# P3 — Gerçek veri, yedekten geri dönüş ve Windows kabul protokolü

**Durum: KABUL HAZIRLIĞI. Gerçek müşteri verisi üzerinde çalıştırılmadı.**
Takip: Issue #6 (https://github.com/seydivakkas/online-sanat-galerisi/issues/6).
P0.1–P3 geliştirme PR'ları #1, #4, #5, #7, #8 ve #9 16 Ekim 2026'da `master` dalına birleştirildi. Gerçek üretim dağıtımı ve kullanıcı kabulü hâlâ yapılmadı.

## İşletim sınırları

1. Veri sahibi onayı olmadan müşteri veritabanı, banka ekstresi veya kişisel veri CI'ya, GitHub'a ya da sohbet ortamına yüklenmez.
2. Gerçek veritabanına seed.js, force/alter Sequelize senkronizasyonu veya sentetik test betikleri uygulanmaz.
3. GitHub-hosted Windows runner ve SQLite sentetik testleri gerçek Windows 10/11 kullanıcı kabulü değildir.
4. PostgreSQL production sürücüsü ve çok-worker senaryoları eksiktir. Yerel SQLite işlem geçidi yalnızca aynı Node.js sürecindeki yazmaları sıraya alır.
5. Banka giriş/çıkışının manuel yönetici beyanı, otomatik banka API'si teyidi değildir.

## Yerel çevrimdışı yedek hazırlama — Issue #6

Bu işlem yalnızca gerçek veri sahibinin veya yetkili operatörün Windows bilgisayarında uygulanır. GitHub bağlantısı kullanıcının bilgisayarına uzaktan erişim sağlamaz.

Galeri uygulamasını ve veritabanına erişen diğer programları durdurun. WAL modunda sıradan .sqlite dosyası kopyası en son kayıtları dışarıda bırakabilir. Git deposundan ayrı, erişimi kısıtlı özel bir yedek klasörü oluşturun; mümkünse şifreli ayrı diskte saklayın. Kaynak veritabanı salt-okunur modda açılır; VACUUM INTO ile yeni bir tutarlı SQLite dosyası oluşturulur. Kaynakta migration, seed veya kayıt değişikliği yapılmaz.

Windows PowerShell komutu:

    powershell -NoProfile -File .\deployment\Prepare-Offline-Acceptance.ps1 -SourceFile "$env:LOCALAPPDATA\ArtGallery\art-gallery.sqlite" -BackupDirectory "D:\PrivateGalleryBackups"

Eski kurulum başka konumdaysa yalnızca yetkili gerçek SQLite dosyasının tam yolunu verin. İlgili dosyanın GitHub'a commit edilmiş örnek olduğunu varsayarak kullanmayın. Komut EVET teyidi ister. Start-Local.ps1 açıkken Windows dosya kilidi nedeniyle reddedilir; bu kilit başka yazılımların veya doğrudan Node.js süreçlerinin kapandığını tek başına kanıtlamaz.

Sonuç klasörü iki dosya içerir: snapshot.sqlite (HAM GERÇEK MÜŞTERİ VERİSİ — ÇOK HASSAS) ve local-report.json (toplu sayılar, özet bulgular, hash, doğrulama sonucu). İşlem mevcut yedeği asla ezmez. Yeni snapshot bağımsız bir kopyaya aktarılıp tekrar açılır; SQLite bütünlük ve toplu sayı karşılaştırması yapılır. Bunun gerçek veride uygulanması henüz doğrulanmadı.

Çıkış kodları: 0 = yedek ve restore provası geçti, otomatik bulgu yok; 2 = yedek ve restore provası geçti, manuel mutabakat gerekiyor; 1 = işlem başarısız veya reddedildi. 0 kodu bile production approval değildir.

snapshot.sqlite, local-report.json, müşteri dosya yolları veya ödeme kayıtları GitHub Issue/PR'larına, ChatGPT sohbetine veya CI artifact'lerine YÜKLENMEZ. Yalnızca veri sahibinin yetkilendirdiği toplu kabul sonucu kurum içinde paylaşılır. Issue #6 gerçek cihaz kanıtı olmadan kapatılmaz.

## A — Çevrimdışı anlık görüntünün salt-okunur incelenmesi

- [ ] Gerçek veri sahibi ve yetkili operatörden yazılı yerel inceleme yetkisi alındı.
- [ ] Uygulama durduruldu; SQLite WAL/SHM dosyalarının durumu denetlendi ve SQLite backup API veya VACUUM INTO ile tutarlı çevrimdışı anlık görüntü hazırlandı. Etkin bir veritabanından yalnızca .sqlite dosyasını kopyalamak WAL verisini kaybettirebilir.
- [ ] Çevrimdışı kopya erişimi kısıtlı yerde, özgün dosyadan ve ek yedekten ayrı tutuldu.
- [ ] UTC tarih/saat, SHA-256 ve dosya yolları yalnızca yetkili kişinin yerel kayıtlarına yazıldı. Banka referansı, müşteri adı ve e-posta GitHub issue'larına eklenmedi.

Backend klasöründen, yalnızca doğrulanmış çevrimdışı anlık görüntü için:

    node acceptance/readOnlyInventory.js --file "C:\KORUMALI_YEDEK\galeri-kabul.sqlite" --offline-copy

Çıktı yalnızca tablo kayıt sayıları, şema durumu ve tutarsızlık adetlerini içerir. Aracın SQL sorguları SELECT ve salt-okunur PRAGMA ile sınırlıdır. Çıkış kodu: 0 = otomatik belirti bulunamadı (üretim onayı değil); 2 = manuel inceleme gerekli; 1 = hatalı dosya veya çalıştırma. Bu komutun çalışması için kaynak veritabanına bağlanmak gerekmez.

Kontrol sınıfları: eksik foreign key, aşırı kontenjan, aktif rezervasyon toplamı/etkinlik sayacı farkı, negatif eser stoğu, eski pending siparişler, tahsilat denetimi olmayan paid siparişler, siparişe bağlanmamış ücretli rezervasyonlar ve eksik bilet-sipariş bağlantıları. Hiç bulgu bulunmaması gerçek banka ödemesi veya fiziksel envanter varlığı kanıtı değildir.

## B — Migration ve bağımsız restore provası

**Orijinal veritabanında değil, ayrı ve onaylı yerel çalışma kopyasında**:

- [ ] İşlemden önce tablo sayıları, kayıt sayıları, şema alanları ve PRAGMA quick_check yazıldı.
- [ ] Backend veritabanı yolu çalışma kopyasına yöneltildi; migration planı okundu.
- [ ] Migration öncesi tutarlı VACUUM INTO yedeği alındı, alternatif diske de kopyalandı.
- [ ] Yalnızca çalışma kopyasında migration uygulandı.
- [ ] Sipariş, rezervasyon, denetim, eser ve etkinlik sayıları ile ilişkileri tekrar doğrulandı. Eski order_id değeri NULL olan kayıtlar otomatik eşleştirilmedi.
- [ ] Migration öncesi yedek, **bağımsız üçüncü dosyaya restore edilip açıldı**. Orijinal şema ve kayıt sayısı doğrulandı; uygulamanın yeniden açılması denendi.
- [ ] Beklenmedik farklarda süreç HOLD olarak işaretlendi; restore prosedürü doğrulanana kadar gerçek veriye geçilmedi.

P3 kodunda sentetik SQLite snapshot restore testi vardır. Bu test, gerçek veri üzerinde bu adımların yapıldığını kanıtlamaz.

## C — Gerçek Windows 10/11 kullanıcı kabulü

- [ ] Windows 10 ve Windows 11 yerel temiz kurulum; erişim izinleri ve kullanıcı hesabı.
- [ ] Uygulamayı açma, kapatma, yeniden başlatma, veri dizini ve JWT secret kalıcılığı.
- [ ] Admin / gallery_manager / customer rollerinde giriş, pasif hesap ve API yetkileri.
- [ ] Sanatçı, kategori, eser, görsel yükleme, destek, etkinlik, kupon ve sipariş yönetimi.
- [ ] Son koltuk / son eser, süre dolumu, iptal, banka onayı ve bağımsız yedekten geri dönüş.
- [ ] Tek yazıcılı SQLite işletim politikası veya ayrıca kabul edilmiş PostgreSQL çok-worker politikası.


## Windows yerel tek-örnek güvenliği — kabul adımı

- Windows başlatıcısı `Start-Local.ps1`, `HOST=127.0.0.1` ayarlayarak yerel HTTP sunucusunu makinenin ağ arayüzlerinden gizler; ağdan erişim/HTTPS sunucu yayını bu yerel profilde desteklenmez.
- Aynı `%LOCALAPPDATA%\ArtGallery` veri dizinini kullanan ikinci `Start-Local.ps1` örneği, `gallery-instance.lock` dosyasında paylaşılmayan açık dosya tanıtıcısı nedeniyle reddedilir. Bu kilit, uygulama normal kapanınca veya başlatıcı çökerse Windows tarafından serbest bırakılır. **Kilit dosyasını silmek, kilidin serbest olduğu anlamına gelmez; kilidi açmak için dosyayı silmeyin.**
- Bu koruma **yalnızca desteklenen PowerShell başlatıcısıyla** açılan uygulamaları kapsar. Aynı SQLite dosyasını doğrudan `node server.js`, başka bir program veya farklı Windows kullanıcısı ile açmayı engellediği iddia edilmez. Çok süreçli kullanım yetkilendirilmeden yayın yapılamaz.
- [ ] Gerçek Windows 10/11'de ilk yerel başlatma sonrası `http://127.0.0.1:3001/api/health` sağlıklı.
- [ ] İlk oturum açıkken ikinci `Start-Local.ps1` hata vererek kapanıyor; ilk oturum ve stok/rezervasyon kayıtları etkilenmiyor.
- [ ] İlk oturum kapatıldıktan sonra tekrar başlatma başarılı; JWT anahtarı ve DB dosyası aynı.
- [ ] Ağda başka bir cihazdan `http://<yerel-makine-IP>:3001` bağlantısı açık değil.

Bu adımların GitHub Windows runner sonucunun PASS olması, gerçek kullanıcının yerel cihazdaki testi yerine geçmez. SQLite çoklu-proses yazma gereksinimi varsa PostgreSQL için ayrı sürücü ve kabul planı gereklidir.

## D — Finansal ve operasyonel kabul

- [ ] Yetkili kişilerce banka girişi/çıkışı, tutar, işlem tarihi, alıcı ve referans bağımsız olarak doğrulandı.
- [ ] Geç gelen havale, kuşkulu dekont, tekrarlanan referans, eski kendiliğinden paid siparişler ve itiraz akışları çözümlendi.
- [ ] Banka çıkışı gerçekleşmeden iade tamamlandı kaydı oluşturulmuyor.
- [ ] Kargoya çıkmış/teslim edilmiş eserler için iade, fiziksel kalite kontrolü ve stoğa geri giriş politikası belirlendi.
- [ ] Etkinliklerin ilan edilen tek Europe/Istanbul oturumu kullanıcı kabulünde doğrulandı.

## E — Üretime geçiş kararı

| Kapı | Mevcut kanıt | Karar |
|---|---|---|
| PR #1/#4/#5/#7/#8/#9 birleştirilebilirlik | GitHub mergeable=true | PASS |
| Sentetik API/güvenlik/bağımlılık | Linux CI, production audit 0 | PASS |
| GitHub-hosted Windows kurulum ve başlangıç | Windows CI | PASS |
| Gerçek veri taşıma + bağımsız geri yükleme | Gerçek kayıt yok, işlem yapılmadı | HOLD |
| Gerçek Windows 10/11 kullanıcı kabulü | Gerçek cihaz kabulü yok | HOLD |
| Gerçek banka mutabakatı / sevk sonrası iade | Onaylı işletim kanıtı yok | HOLD |
| PostgreSQL kullanılacaksa sürücü ve concurrency | Eksik | HOLD |

**Release = HOLD.** Issue #6'nın gerçek ortam kabulü tamamlanmadan sürüm yayını, canlı veri migration'ı veya üretim dağıtımı yapılmaz. Kodun `master` dalına alınmış olması üretim onayı değildir.
