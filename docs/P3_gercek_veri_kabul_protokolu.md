# P3 — Gerçek veri, yedekten geri dönüş ve Windows kabul protokolü

**Durum: KABUL HAZIRLIĞI. Gerçek müşteri verisi üzerinde çalıştırılmadı.**
Takip: Issue #6 (https://github.com/seydivakkas/online-sanat-galerisi/issues/6).
Bütün PR'lar taslak durumunda; üretim dağıtımı ve master'a merge yok.

## İşletim sınırları

1. Veri sahibi onayı olmadan müşteri veritabanı, banka ekstresi veya kişisel veri CI'ya, GitHub'a ya da sohbet ortamına yüklenmez.
2. Gerçek veritabanına seed.js, force/alter Sequelize senkronizasyonu veya sentetik test betikleri uygulanmaz.
3. GitHub-hosted Windows runner ve SQLite sentetik testleri gerçek Windows 10/11 kullanıcı kabulü değildir.
4. PostgreSQL production sürücüsü ve çok-worker senaryoları eksiktir. Yerel SQLite işlem geçidi yalnızca aynı Node.js sürecindeki yazmaları sıraya alır.
5. Banka giriş/çıkışının manuel yönetici beyanı, otomatik banka API'si teyidi değildir.

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

**Release = HOLD.** Issue #6'yı kapatmadan, gerçek veriyi doğrulamadan veya bütün kabul kapılarını geçmeden mevcut PR'lar Draft'tan çıkarılmaz; master'a merge ve sürüm yayını yapılmaz.
