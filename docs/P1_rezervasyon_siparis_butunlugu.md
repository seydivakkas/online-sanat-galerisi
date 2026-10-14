# P1 — Rezervasyon ve Sipariş Bütünlüğü

Durum: **DRAFT / HOLD**. Bu dal PR #4'ün (`security/p0-2-payment-lifecycle`) üstündedir. PR #1 ve PR #4 birleştirilmedi. `master` değiştirilmedi.

## 1. Tek kaynak ve sistem sınırları

- Her etkinlikte **tek ilan edilmiş oturum** bulunur: `Event.event_date` (`YYYY-MM-DD`) ve `Event.event_time` (`HH:MM`). P1 sunucu karşılaştırmalarında zaman dilimi **Europe/Istanbul (UTC+03)** olarak yorumlanır. Çoklu oturum / etkinlik tekrarları henüz desteklenmiyor.
- `events.current_registrations` **onaylanmış + henüz süresi dolmamış, ödeme bekleyen** kişilerin sayısını birlikte ifade eder. Sıfır/negatif kapasite ve eşzamanlı aşım engellenmelidir.
- `artworks.stock_quantity` müşteriye **satılabilir** mevcut adettir; ödeme bekleyen siparişler bu adedi süreli olarak azaltır.
- Sipariş `pending` iken ücretli etkinlik rezervasyonu `pending` kalır. Yalnızca gerçek banka ekstresinden **admin'in manuel mutabakat beyanıyla** `paid` olunca bağlı rezervasyon `confirmed` olur.
- Ücretsiz etkinlikler `POST /api/reservations` üzerinden doğrudan `confirmed` olur; ücretli etkinliklere bu uç noktadan kayıt yapılamaz.
- Kart/PayPal için ödeme servisleri bağlı değil; havale/EFT dışında ödeme kesinleştirmesi yok. İade gerçek banka çıkışı doğrulandığına ilişkin **manuel beyanla** kaydedilir, otomatik banka doğrulaması yapıldığı iddia edilmez.

## 2. Durum makinesi

```text
Yeni sipariş:
  checkout -> pending [Order.expires_at + süreli stok/kontenjan]
  pending -> paid [admin banka tahsilatı mutabakatı; rezervasyon pending -> confirmed]
  pending -> cancelled [müşteri iptali veya süre aşımı; stok/kontenjan iadesi]
  paid -> shipped -> delivered [sanat eseri; audit kaydı]
  paid -> cancelled [admin gerçek banka çıkışını kontrol ettikten sonra manuel tam iade;
                      yalnızca henüz sevk edilmemiş ve geçmemiş etkinlik]
  shipped/delivered -> refunded/cancelled YOK [kargo dönüşü ve stok kabulü henüz tasarlanmadı]

Ücretsiz etkinlik:
  doğrudan confirmed -> cancelled [kullanıcı tarafından; atomik kontenjan iadesi]
```

### İlgili API'ler

| API | Koşul |
|---|---|
| `POST /api/orders` | Auth; banka havalesi; geçerli ürün ve ilan edilen etkinlik oturumu. Başarılı: `201 pending` |
| `POST /api/orders/:id/cancel` | Yalnızca sipariş sahibi ve `pending`, ikinci tekrar idempotent |
| `POST /api/orders/:id/confirm` | Daima `410`, müşteri ödemeyi kendisi onaylayamaz |
| `POST /api/admin/orders/:id/verify-bank-transfer` | Yalnızca admin; banka giriş kaydı, tutar/tarih/referans; süre geçmişse reddedilir |
| `POST /api/admin/orders/:id/verify-bank-refund` | Yalnızca admin; doğrulanmış banka çıkışı ve özgün referans, tam tutar; `paid` ve sevk edilmemiş |
| `POST /api/reservations` | Auth, yalnızca ücretsiz, tarih/saat kesin eşleşmeli |
| `PUT /api/reservations/:id` / `DELETE /api/reservations/:id` | Yalnızca doğrudan rezervasyon; siparişe bağlı kayıtlar sipariş üzerinden yönetilir |
| `PUT /api/admin/events/:id` | Aktif rezervasyon varsa tarih, saat, fiyat değiştirme veya kontenjanı kayıt altına düşürme reddedilir |
| `DELETE /api/admin/events/:id` | Fiziksel silme yerine `is_active=false`; geçmiş ilişkileri korur |

## 3. Atomiklik ve iptal

- `services/inventory.js`: stok ve kontenjan değişiklikleri tek SQL koşullu UPDATE içindedir; son stok/koltuk iki talebe verilmez. Negatif stok veya kayıt sayısı üretmemek için artış/azalışlar sınırlarla korunur.
- `services/orderHolds.js`: siparişin durum değişikliği, stok iadesi, bağlantılı rezervasyonun iptali, kupon sayacının geri alınması ve audit kaydı tek **Sequelize transaction** içindedir.
- `services/orderLifecycle.js`: banka ödeme onayı ve bağlı rezervasyonların kesinleştirilmesi, durum kaydıyla beraber tek transaction'da yapılır.
- `PENDING_ORDER_TTL_MINUTES`: 15–10080 dakika aralığı; varsayılan **1440 dakika (24 saat)**. Süre, API isteğinin sunucu zamanından hesaplanır. Sunucu açılışında, dakikada bir ve ilgili sipariş sorgularında/işlemlerinde bekleyenler serbest bırakılır.
- Süre aşımı yalnızca `expires_at IS NOT NULL` olan **yeni P1 siparişlerinde** otomatik işler. Daha eski satırlara geriye dönük süre uygulanmaz.
- Rezervasyon ile sipariş eşleşmeyen legacy etkinlik kayıtları otomatik serbest bırakılmaz veya banka onayından geçirilmez; manuel mutabakat gerektirir.

## 4. Veritabanı ve dağıtım sınırı

Bu dalda şema ilaveleri:
- `orders.expires_at` — nullable UTC zaman damgası.
- `reservations.order_id` — nullable, `orders.order_id` FK.
- `order_status_audits.actor_id` — sistem süre aşımı işleminde null (sistem tarafından yapıldı).

**Üretim migration henüz yoktur; Sequelize `sync()` mevcut production şemasında bu yeni kolonları kendiliğinden güvenli migrate etmez.** Kayıtlı `backend/database.sqlite` veya gerçek müşteri verisiyle `seed.js` çalıştırılmamalıdır (veri silme riski). Yeni kolonların üretime geçişi P2'de migration + yedekleme ile yapılacaktır.

Geçmişten devralınan güvenlik açığı: npm audit **18 bulgu (2 kritik, 9 yüksek, 4 orta, 3 düşük)**. Ayrıntılar: Issue #2. P0.1 / P0.2 PR'ları merge edilmediği için P1 de merge HOLD.

## 5. İzole doğrulama

```bash
cd backend
npm ci
npm run test:security
npm run test:payments
npm run test:integrity
npm audit --omit=dev --audit-level=high
cd ../frontend
npm ci
npm run build
```

GitHub Actions run `38551966327`:
- JWT/görsel güvenliği **10/10 PASS**
- Ödeme ve audit güvenliği **11/11 PASS**
- P1 rezervasyon/sipariş bütünlüğü **14/14 PASS**
- React build **PASS**
- `npm audit` **FAIL** — genel bağımlılıklar düzeltilecek.

Testler bellek içi SQLite + sentetik kullanıcı, eser ve etkinlik verisinde çalışır. **Gerçek banka hesap hareketi, Windows kurulumu, PostgreSQL paralel yük senaryoları, üretim migration ve uçtan uca kullanıcı kabulü yapılmadı.**

## 6. Sonraki açık noktalar

1. `npm audit` açıkları için Issue #2 çözülmeden üretime çıkış yok.
2. P2: şema migration ve güvenli rollback, gerçek PostgreSQL concurrency testi, indexes/partial unique aktif rezervasyon kısıtları.
3. P2: ayrıntılı iptal/iade politikası, kargodan dönen sanat eserinin kalite kontrol ve envantere geri alınması; `delivered` sonrası iadeler şu an otomatik uygulanmaz.
4. Çok oturumlu etkinlikler, tarih bazlı ayrı oturum kapasitesi ve farklı zaman dilimleri için yeni `EventSession` veri modeli gereklidir.
5. Banka verisi insan teyidine dayalıdır. Sahte manuel beyanı engellemek için çift kontrol/denetim ve finansal mutabakat raporları ayrıca eklenmelidir.

**Birleştirme kararı:** DRAFT / HOLD. Kodlamanın ve sentetik testlerin tamamlanması, üretim kabulü değildir.
