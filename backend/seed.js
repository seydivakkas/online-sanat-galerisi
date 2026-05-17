const bcrypt = require('bcryptjs');
const { sequelize, User, Artist, Category, Artwork, Event, Reservation, Order, OrderItem, Favorite, Review, ReviewVote, ReviewReply, Coupon, SupportTicket, SupportMessage, Comparison } = require('./models');

async function seed() {
  try {
    await sequelize.sync({ force: true });
    console.log('Tablolar sıfırlandı');

    const hash = await bcrypt.hash('password123', 12);

    // ────────────────────────────────────────
    // USERS (10 kullanıcı)
    // ────────────────────────────────────────
    const users = await User.bulkCreate([
      { username: 'admin', email: 'admin@gallery.com', password_hash: hash, full_name: 'Yönetici Admin', phone: '05301000001', role: 'admin' },
      { username: 'galeri_mgr', email: 'manager@gallery.com', password_hash: hash, full_name: 'Selin Korkmaz', phone: '05301000002', role: 'gallery_manager' },
      { username: 'galeri_mgr2', email: 'manager2@gallery.com', password_hash: hash, full_name: 'Emre Topçu', phone: '05301000003', role: 'gallery_manager' },
      { username: 'ahmet_y', email: 'ahmet@email.com', password_hash: hash, full_name: 'Ahmet Yılmaz', phone: '05321112233', role: 'customer' },
      { username: 'ayse_k', email: 'ayse@email.com', password_hash: hash, full_name: 'Ayşe Kaya', phone: '05324445566', role: 'customer' },
      { username: 'mehmet_d', email: 'mehmet@email.com', password_hash: hash, full_name: 'Mehmet Demir', phone: '05327778899', role: 'customer' },
      { username: 'zeynep_a', email: 'zeynep@email.com', password_hash: hash, full_name: 'Zeynep Açık', phone: '05333334455', role: 'customer' },
      { username: 'burak_s', email: 'burak@email.com', password_hash: hash, full_name: 'Burak Sarı', phone: '05339998877', role: 'customer' },
      { username: 'elif_t', email: 'elif@email.com', password_hash: hash, full_name: 'Elif Tuncer', phone: '05335556677', role: 'customer' },
      { username: 'cem_oz', email: 'cem@email.com', password_hash: hash, full_name: 'Cem Öztürk', phone: '05338887766', role: 'customer' }
    ]);
    console.log('✓ 10 Kullanıcı eklendi');

    // ────────────────────────────────────────
    // ARTISTS (10 sanatçı - gerçekçi biyografiler)
    // ────────────────────────────────────────
    const artists = await Artist.bulkCreate([
      { name: 'Elif Şahin', bio: 'İstanbul doğumlu Elif Şahin, Mimar Sinan Üniversitesi Güzel Sanatlar mezunudur. Soyut ekspresyonizm ve dijital sanat alanında 15 yıllık deneyime sahiptir. Eserleri New York, Londra ve İstanbul modern sanat galerilerinde sergilenmiştir.', profile_image_url: null, website: 'https://elifsahin.art' },
      { name: 'Can Özdemir', bio: 'Ege bölgesinin doğal güzelliklerinden ilham alan Can Özdemir, peyzaj ressamlığında Türkiye\'nin önde gelen isimlerinden biridir. Yağlı boya ve akrilik tekniklerinde uzmanlaşmış, Devlet Güzel Sanatlar Sergisi\'nde 3 kez ödül almıştır.', profile_image_url: null, website: 'https://canozdemir.com' },
      { name: 'Seda Arslan', bio: 'Çağdaş seramik ve heykel sanatçısı. Anadolu motiflerini modern formlarla birleştiren özgün üslubuyla tanınır. Çalışmaları Japonya, İtalya ve Türkiye\'deki bienallerde yer almıştır.', profile_image_url: null, website: null },
      { name: 'Burak Yıldız', bio: 'Belgesel ve sokak fotoğrafçısı. National Geographic Türkiye\'de yayımlanan fotoğraflarıyla bilinen Burak Yıldız, İstanbul\'un kaybolmaya yüz tutmuş semtlerini ve insan hikayelerini objektifine yansıtmaktadır.', profile_image_url: null, website: 'https://burakyildiz.photo' },
      { name: 'Deniz Acar', bio: 'Suluboya ve mürekkep çizim ustası. Botanik illüstrasyon ve portreleriyle tanınan genç sanatçı, son 5 yılda 12 kişisel sergi açmıştır.', profile_image_url: null, website: null },
      { name: 'Nadia Volkov', bio: 'Rus-Türk kökenli çağdaş sanatçı. Geometrik soyutlama ve kinetik heykel alanında çalışır. Milano Triennale\'de Altın Madalya kazanmıştır.', profile_image_url: null, website: 'https://nadiavolkov.studio' },
      { name: 'Kaan Erdem', bio: 'İstanbul Teknik Üniversitesi endüstriyel tasarım bölümü çıkışlı Kaan Erdem, geleneksel hat sanatını çağdaş yorumlarla buluşturan eserleriyle uluslararası tanınırlık kazanmıştır.', profile_image_url: null, website: 'https://kaanerdem.art' },
      { name: 'Meryem Balcı', bio: 'Tekstil sanatçısı ve illüstratör. El dokuması tekniklerini büyük ölçekli enstalasyonlara taşıyan eserleriyle Venedik Bienali\'nde Türkiye\'yi temsil etmiştir.', profile_image_url: null, website: null },
      { name: 'Oğuz Tanrıkulu', bio: 'Empresyonist portre ressamı. Yağlı boya ve pastel tekniklerinde ustalaşmış, 200\'den fazla portre siparişi tamamlamıştır. Cumhurbaşkanlığı Kültür ve Sanat Büyük Ödülü sahibidir.', profile_image_url: null, website: 'https://oguz-art.com' },
      { name: 'Lara Yenişen', bio: 'Dijital medya sanatçısı ve animatör. NFT koleksiyonları dünya çapında ilgi gören Lara, teknoloji ve sanatın kesişiminde yenilikçi projeler üretmektedir.', profile_image_url: null, website: 'https://larayenisen.xyz' }
    ]);
    console.log('✓ 10 Sanatçı eklendi');

    // ────────────────────────────────────────
    // CATEGORIES (8 kategori)
    // ────────────────────────────────────────
    const categories = await Category.bulkCreate([
      { name: 'Yağlı Boya', description: 'Tuval üzerine yağlı boya tablolar. Klasik ve modern teknikler.' },
      { name: 'Suluboya', description: 'Kağıt veya tuval üzerine suluboya ile yapılmış eserler.' },
      { name: 'Dijital Sanat', description: 'Bilgisayar ortamında dijital araçlarla üretilmiş görsel sanat eserleri.' },
      { name: 'Heykel', description: 'Taş, metal, seramik veya karışık malzemelerle üretilen üç boyutlu sanat eserleri.' },
      { name: 'Fotoğraf', description: 'Sanat fotoğrafçılığı: doğa, portre, sokak, belgesel, mimari.' },
      { name: 'Karakalem', description: 'Grafit, kömür veya füzen ile yapılmış çizim eserleri.' },
      { name: 'Hat Sanatı', description: 'Osmanlı ve İslam hat geleneğinden beslenen çağdaş hat eserleri.' },
      { name: 'Tekstil Sanatı', description: 'El dokuması, nakış ve kumaş üzerine baskı teknikleriyle üretilen eserler.' }
    ]);
    console.log('✓ 8 Kategori eklendi');

    // ────────────────────────────────────────
    // ARTWORKS (25 eser - zengin ve gerçekçi)
    // ────────────────────────────────────────
    const artworks = await Artwork.bulkCreate([
      // Elif Şahin (artist 1) — Dijital & Yağlı Boya
      { title: 'Mavi Rüya', description: 'Soyut mavi tonlarında tuval üzerine yağlı boya. 80x120 cm. Derinliği hissettiren katmanlı fırça darbeleriyle oluşturulmuş, meditativ bir atmosfer yayar.', artist_id: 1, category_id: 1, price: 4500.00, stock_quantity: 1, view_count: 342, image_url: null },
      { title: 'Dijital Senfoni No.3', description: 'Müzik dalgalarından ilham alan algoritmik soyut eser. 4K çözünürlük, sınırlı baskı (5 kopya). Her kopya sertifikalıdır.', artist_id: 1, category_id: 3, price: 2200.00, stock_quantity: 5, view_count: 189, image_url: null },
      { title: 'Neon Gece', description: 'Neon ışıklar altında İstanbul silueti. Dijital boya ve fotoğraf kolaj tekniği. Cyberpunk estetiğiyle Haliç manzarası.', artist_id: 1, category_id: 3, price: 3200.00, stock_quantity: 3, view_count: 456, image_url: null },
      { title: 'Parçalanmış Bellek', description: 'Hafıza ve kimlik kavramlarını sorgulayan soyut ekspresyonist tablo. Tuval üzerine karışık teknik. 100x150 cm.', artist_id: 1, category_id: 1, price: 6800.00, stock_quantity: 1, view_count: 278, image_url: null },

      // Can Özdemir (artist 2) — Yağlı Boya Peyzaj
      { title: 'Kapadokya Gün Batımı', description: 'Göreme vadisinin altın saatinde büyüleyici manzarası. Tuval üzerine yağlı boya. 90x130 cm. Sıcak toprak tonları ve dramatik gökyüzü.', artist_id: 2, category_id: 1, price: 7800.00, stock_quantity: 1, view_count: 612, image_url: null },
      { title: 'Ege Zeytinlikleri', description: 'Ayvalık zeytinliklerinin sabah sisiyle buluşması. Empresyonist tarzda yağlı boya. 70x100 cm.', artist_id: 2, category_id: 1, price: 5500.00, stock_quantity: 1, view_count: 387, image_url: null },
      { title: 'Saklıkent Kanyonu', description: 'Fethiye Saklıkent Kanyonu\'nun turkuaz sularını betimleyen peyzaj. 60x90 cm. Doğanın ham gücü ve dinginliği bir arada.', artist_id: 2, category_id: 1, price: 4200.00, stock_quantity: 2, view_count: 251, image_url: null },

      // Seda Arslan (artist 3) — Heykel & Seramik
      { title: 'Anadolu Vazosu', description: 'Hitit ve Frigya motiflerini çağdaş formlarla birleştiren seramik vazo. Yükseklik: 45 cm. El yapımı, tek kopya.', artist_id: 3, category_id: 4, price: 3500.00, stock_quantity: 3, view_count: 156, image_url: null },
      { title: 'Metamorfoz', description: 'İnsan figürünün bronz döküm ile soyutlanmış hali. Yükseklik: 65 cm. Değişim ve dönüşüm temasını işler.', artist_id: 3, category_id: 4, price: 12500.00, stock_quantity: 1, view_count: 98, image_url: null },
      { title: 'Toprak Ana', description: 'Anadolu bereket tanrıçası Kybele\'den esinlenen modern seramik heykel. Pişmiş toprak ve sır tekniği. Yükseklik: 35 cm.', artist_id: 3, category_id: 4, price: 4800.00, stock_quantity: 2, view_count: 167, image_url: null },

      // Burak Yıldız (artist 4) — Fotoğraf
      { title: 'İstanbul Sokakları', description: 'Beyoğlu, Balat ve Kadıköy sokaklarından siyah-beyaz fotoğraf serisi. 30x45 cm Giclée baskı, müze kalitesi kağıt.', artist_id: 4, category_id: 5, price: 1800.00, stock_quantity: 10, view_count: 523, image_url: null },
      { title: 'Son Balıkçılar', description: 'Galata Köprüsü\'nün son olta balıkçılarını belgeleyen etkileyici fotoğraf. 40x60 cm, sınırlı baskı.', artist_id: 4, category_id: 5, price: 2500.00, stock_quantity: 5, view_count: 445, image_url: null },
      { title: 'Doğu Ekspresi Penceresi', description: 'Kars\'a giden tren yolculuğundan kar manzaralı fotoğraf. 50x70 cm.', artist_id: 4, category_id: 5, price: 2100.00, stock_quantity: 8, view_count: 389, image_url: null },
      { title: 'Kapalıçarşı Işıkları', description: 'Tarihi Kapalıçarşı\'nın altın ışıkları altında 500 yıllık koridorlar. 40x60 cm.', artist_id: 4, category_id: 5, price: 1950.00, stock_quantity: 6, view_count: 312, image_url: null },

      // Deniz Acar (artist 5) — Suluboya & Karakalem
      { title: 'Bahar Çiçekleri', description: 'Botanik illüstrasyon: Türk florasından endemik bahar çiçekleri. Suluboya, 35x50 cm.', artist_id: 5, category_id: 2, price: 1500.00, stock_quantity: 2, view_count: 178, image_url: null },
      { title: 'Göl Kenarı', description: 'Abant Gölü\'nün sonbahar renklerini yansıtan karakalem çalışma. 30x40 cm, çerçeveli.', artist_id: 5, category_id: 6, price: 900.00, stock_quantity: 4, view_count: 145, image_url: null },
      { title: 'Kedi Portresi', description: 'İstanbul sokak kedilerinden ilham alan detaylı suluboya portre serisi. 25x35 cm.', artist_id: 5, category_id: 2, price: 1200.00, stock_quantity: 7, view_count: 567, image_url: null },

      // Nadia Volkov (artist 6) — Geometrik / Kinetik
      { title: 'Kristal Fraktal', description: 'Fraktal geometriden esinlenen pleksiglas ve LED enstalasyon. 50x50x50 cm küp formunda. Renkler periyodik olarak değişir.', artist_id: 6, category_id: 4, price: 15000.00, stock_quantity: 1, view_count: 89, image_url: null },
      { title: 'Geometrik Harmoni', description: 'Altın oran ve Fibonacci spiralinden esinlenen yağlı boya tablo. 100x100 cm. Minimalist renk paleti.', artist_id: 6, category_id: 1, price: 8500.00, stock_quantity: 1, view_count: 234, image_url: null },

      // Kaan Erdem (artist 7) — Hat Sanatı
      { title: 'Bismillah Levhası', description: 'Klasik sülüs hat ile yazılmış Besmele levhası. Altın varaklı, ahşap çerçeveli. 50x70 cm.', artist_id: 7, category_id: 7, price: 3800.00, stock_quantity: 3, view_count: 298, image_url: null },
      { title: 'Neon Elif', description: 'Geleneksel Elif harfinin neon tüp yorumu. Cam ve metal. Yükseklik: 80 cm. Gelenek ile modernliğin buluşması.', artist_id: 7, category_id: 7, price: 6200.00, stock_quantity: 1, view_count: 345, image_url: null },

      // Meryem Balcı (artist 8) — Tekstil
      { title: 'Anadolu Kilimi Kolaj', description: 'Geleneksel Anadolu kilim motiflerini bir araya getiren duvar halısı. El dokuma, doğal boyalar. 150x200 cm.', artist_id: 8, category_id: 8, price: 9200.00, stock_quantity: 1, view_count: 134, image_url: null },
      { title: 'İpek Rüzgâr', description: 'İpek kumaş üzerine batik tekniğiyle oluşturulmuş soyut eser. 80x120 cm, ahşap çerçeveli.', artist_id: 8, category_id: 8, price: 4600.00, stock_quantity: 2, view_count: 112, image_url: null },

      // Oğuz Tanrıkulu (artist 9) — Portre
      { title: 'Yaşlı Balıkçı Portresi', description: 'Ege sahillerinden bir balıkçının gerçekçi yağlı boya portresi. 60x80 cm. Işık ve gölge ustalığı.', artist_id: 9, category_id: 1, price: 5200.00, stock_quantity: 1, view_count: 287, image_url: null },

      // Lara Yenişen (artist 10) — Dijital
      { title: 'Cyber İstanbul 2077', description: 'Gelecekte İstanbul\'un hayali görünümü. Dijital illüstrasyon. 4K çözünürlük, sınırlı 10 baskı.', artist_id: 10, category_id: 3, price: 2800.00, stock_quantity: 10, view_count: 723, image_url: null }
    ]);
    console.log('✓ 25 Eser eklendi');

    // ────────────────────────────────────────
    // EVENTS (10 etkinlik)
    // ────────────────────────────────────────
    const events = await Event.bulkCreate([
      { title: 'Yağlı Boya Atölyesi: Başlangıç', description: 'Yeni başlayanlar için yağlı boya temelleri. Malzemeler dahil. Eğitmen: Can Özdemir.', event_date: '2026-04-15', event_time: '10:00', duration_minutes: 180, capacity: 20, current_registrations: 14, price: 350.00, location: 'Galeri Merkez Stüdyo, Beyoğlu', organizer_id: 2, is_active: true },
      { title: 'Dijital İllüstrasyon Workshop', description: 'iPad Pro ve Procreate ile dijital çizim. Cihaz getirmeniz yeterli.', event_date: '2026-04-20', event_time: '14:00', duration_minutes: 120, capacity: 15, current_registrations: 11, price: 250.00, location: 'Online (Zoom)', organizer_id: 2, is_active: true },
      { title: 'Fotoğrafçılık Gezisi: Tarihi Yarımada', description: 'Sultanahmet, Süleymaniye ve Eminönü\'de yarım günlük fotoğraf turu. Eğitmen: Burak Yıldız.', event_date: '2026-05-01', event_time: '09:00', duration_minutes: 240, capacity: 25, current_registrations: 22, price: 200.00, location: 'Sultanahmet Meydanı, İstanbul', organizer_id: 2, is_active: true },
      { title: 'Seramik Atölyesi: El Şekillendirme', description: 'Torna kullanmadan seramik şekillendirme tekniklerini öğrenin. Pişirme dahil.', event_date: '2026-05-10', event_time: '11:00', duration_minutes: 150, capacity: 12, current_registrations: 7, price: 400.00, location: 'Çömlek Atölyesi, Kadıköy', organizer_id: 3, is_active: true },
      { title: 'Sanat Tarihi Söyleşisi: Modern Türk Sanatı', description: 'Prof. Dr. Zehra Çotar ile 100 yıllık Türk sanat serüveni. Soru-cevap bölümü dahil.', event_date: '2026-05-15', event_time: '18:00', duration_minutes: 90, capacity: 50, current_registrations: 38, price: 0.00, location: 'Pera Müzesi Konferans Salonu', organizer_id: 2, is_active: true },
      { title: 'Karakalem Portre Kursu', description: 'Yüz anatomisi, ışık-gölge ve portre çizim teknikleri. 3 günlük intensif kurs.', event_date: '2026-06-01', event_time: '10:00', duration_minutes: 180, capacity: 15, current_registrations: 5, price: 450.00, location: 'Galeri Merkez Stüdyo, Beyoğlu', organizer_id: 3, is_active: true },
      { title: 'Hat Sanatı Atölyesi', description: 'Kaan Erdem eşliğinde geleneksel hat sanatına giriş. Kamış kalem ve mürekkep dahil.', event_date: '2026-06-10', event_time: '13:00', duration_minutes: 120, capacity: 10, current_registrations: 8, price: 500.00, location: 'Hüsn-ü Hat Merkezi, Fatih', organizer_id: 2, is_active: true },
      { title: 'Suluboya Botanik İllüstrasyon', description: 'Deniz Acar ile çiçek ve bitki illüstrasyonu. Her seviyeye uygun.', event_date: '2026-06-20', event_time: '10:00', duration_minutes: 180, capacity: 18, current_registrations: 12, price: 300.00, location: 'Botanik Bahçe Atölyesi, Beşiktaş', organizer_id: 3, is_active: true },
      { title: 'NFT ve Dijital Sanat Paneli', description: 'Dijital sanatçılar ve küratörlerle NFT geleceği paneli. Networking imkanı.', event_date: '2026-07-05', event_time: '15:00', duration_minutes: 120, capacity: 80, current_registrations: 45, price: 0.00, location: 'İstanbul Modern Anfisi', organizer_id: 2, is_active: true },
      { title: 'Çocuklar için Sanat Atölyesi', description: '7-12 yaş grubu için eğlenceli resim ve el sanatları atölyesi.', event_date: '2026-07-15', event_time: '10:00', duration_minutes: 120, capacity: 20, current_registrations: 16, price: 150.00, location: 'Galeri Merkez Stüdyo, Beyoğlu', organizer_id: 3, is_active: true }
    ]);
    console.log('✓ 10 Etkinlik eklendi');

    // ────────────────────────────────────────
    // RESERVATIONS (12 kayıt)
    // ────────────────────────────────────────
    await Reservation.bulkCreate([
      { user_id: 4, event_id: 1, participant_count: 1, reservation_date: '2026-04-15', reservation_time: '10:00', status: 'confirmed' },
      { user_id: 5, event_id: 1, participant_count: 2, reservation_date: '2026-04-15', reservation_time: '10:00', status: 'confirmed' },
      { user_id: 6, event_id: 2, participant_count: 1, reservation_date: '2026-04-20', reservation_time: '14:00', status: 'confirmed' },
      { user_id: 4, event_id: 2, participant_count: 1, reservation_date: '2026-04-20', reservation_time: '14:00', status: 'pending' },
      { user_id: 7, event_id: 3, participant_count: 3, reservation_date: '2026-05-01', reservation_time: '09:00', status: 'confirmed' },
      { user_id: 8, event_id: 3, participant_count: 2, reservation_date: '2026-05-01', reservation_time: '09:00', status: 'confirmed' },
      { user_id: 9, event_id: 4, participant_count: 1, reservation_date: '2026-05-10', reservation_time: '11:00', status: 'confirmed' },
      { user_id: 10, event_id: 5, participant_count: 2, reservation_date: '2026-05-15', reservation_time: '18:00', status: 'confirmed' },
      { user_id: 5, event_id: 6, participant_count: 1, reservation_date: '2026-06-01', reservation_time: '10:00', status: 'pending' },
      { user_id: 6, event_id: 7, participant_count: 1, reservation_date: '2026-06-10', reservation_time: '13:00', status: 'confirmed' },
      { user_id: 4, event_id: 5, participant_count: 1, reservation_date: '2026-05-15', reservation_time: '18:00', status: 'confirmed' },
      { user_id: 8, event_id: 8, participant_count: 2, reservation_date: '2026-06-20', reservation_time: '10:00', status: 'pending' }
    ]);
    console.log('✓ 12 Rezervasyon eklendi');

    // ────────────────────────────────────────
    // ORDERS (8 sipariş)
    // ────────────────────────────────────────
    const orders = await Order.bulkCreate([
      { user_id: 4, total_amount: 4500.00, status: 'delivered', payment_method: 'credit_card', discount_amount: 0 },
      { user_id: 5, total_amount: 3500.00, status: 'delivered', payment_method: 'bank_transfer', discount_amount: 0 },
      { user_id: 6, total_amount: 1800.00, status: 'delivered', payment_method: 'paypal', discount_amount: 0 },
      { user_id: 7, total_amount: 1350.00, status: 'shipped', payment_method: 'credit_card', discount_amount: 150 },
      { user_id: 4, total_amount: 3200.00, status: 'delivered', payment_method: 'credit_card', discount_amount: 0 },
      { user_id: 8, total_amount: 7800.00, status: 'paid', payment_method: 'bank_transfer', discount_amount: 0 },
      { user_id: 9, total_amount: 2100.00, status: 'delivered', payment_method: 'credit_card', discount_amount: 0 },
      { user_id: 10, total_amount: 5200.00, status: 'shipped', payment_method: 'paypal', discount_amount: 520 }
    ]);
    console.log('✓ 8 Sipariş eklendi');

    // ────────────────────────────────────────
    // ORDER ITEMS (10 kalem)
    // ────────────────────────────────────────
    await OrderItem.bulkCreate([
      { order_id: 1, item_type: 'artwork', item_id: 1, quantity: 1, unit_price: 4500.00 },
      { order_id: 2, item_type: 'artwork', item_id: 8, quantity: 1, unit_price: 3500.00 },
      { order_id: 3, item_type: 'artwork', item_id: 11, quantity: 1, unit_price: 1800.00 },
      { order_id: 4, item_type: 'artwork', item_id: 16, quantity: 1, unit_price: 1500.00 },
      { order_id: 5, item_type: 'artwork', item_id: 3, quantity: 1, unit_price: 3200.00 },
      { order_id: 6, item_type: 'artwork', item_id: 5, quantity: 1, unit_price: 7800.00 },
      { order_id: 7, item_type: 'artwork', item_id: 13, quantity: 1, unit_price: 2100.00 },
      { order_id: 8, item_type: 'artwork', item_id: 24, quantity: 1, unit_price: 5200.00 },
      { order_id: 4, item_type: 'artwork', item_id: 17, quantity: 1, unit_price: 1200.00 },
      { order_id: 5, item_type: 'event', item_id: 2, quantity: 1, unit_price: 250.00 } // Bir adet etkinlik bileti satın alımı eklendi
    ]);
    console.log('✓ 10 Sipariş kalemi eklendi');

    // ────────────────────────────────────────
    // FAVORITES (20 favori)
    // ────────────────────────────────────────
    await Favorite.bulkCreate([
      { user_id: 4, artwork_id: 5 }, { user_id: 4, artwork_id: 11 }, { user_id: 4, artwork_id: 17 },
      { user_id: 5, artwork_id: 1 }, { user_id: 5, artwork_id: 3 }, { user_id: 5, artwork_id: 25 },
      { user_id: 6, artwork_id: 5 }, { user_id: 6, artwork_id: 8 }, { user_id: 6, artwork_id: 20 },
      { user_id: 7, artwork_id: 1 }, { user_id: 7, artwork_id: 12 }, { user_id: 7, artwork_id: 21 },
      { user_id: 8, artwork_id: 2 }, { user_id: 8, artwork_id: 14 }, { user_id: 8, artwork_id: 19 },
      { user_id: 9, artwork_id: 3 }, { user_id: 9, artwork_id: 15 }, { user_id: 9, artwork_id: 25 },
      { user_id: 10, artwork_id: 5 }, { user_id: 10, artwork_id: 7 }
    ]);
    console.log('✓ 20 Favori eklendi');

    // ────────────────────────────────────────
    // REVIEWS (15 yorum)
    // ────────────────────────────────────────
    const reviews = await Review.bulkCreate([
      { user_id: 4, artwork_id: 1, rating: 5, comment: 'Muhteşem bir eser! Mavi tonları odamda harika duruyor. Renk geçişleri harikulade.', is_verified: true },
      { user_id: 6, artwork_id: 11, rating: 4, comment: 'Fotoğraflar çok atmosferik. Siyah-beyaz baskı kalitesi mükemmel. Çerçevelettirip astım.', is_verified: true },
      { user_id: 4, artwork_id: 3, rating: 5, comment: 'Dijital sanatın büyüleyici bir örneği. Neon İstanbul çok etkileyici.', is_verified: true },
      { user_id: 9, artwork_id: 13, rating: 4, comment: 'Doğu Ekspresi fotoğrafı odamda büyüleyici bir atmosfer yaratıyor.', is_verified: true },
      { user_id: 5, artwork_id: 8, rating: 5, comment: 'Anadolu Vazosu gerçekten el yapımı sanat eseri. Detaylar muhteşem.', is_verified: true },
      { user_id: 4, event_id: 1, rating: 5, comment: 'Can Özdemir muhteşem bir eğitmen. 3 saatte gerçek bir tablo yaptım! Kesinlikle tavsiye ederim.', is_verified: true },
      { user_id: 5, event_id: 1, rating: 4, comment: 'Atölye ortamı çok güzeldi ama biraz kalabalıktı. Eğitmenin ilgisi yeterliydi.', is_verified: true },
      { user_id: 7, event_id: 3, rating: 5, comment: 'Burak Yıldız ile İstanbul sokaklarında fotoğraf çekmek muhteşem bir deneyimdi. 100+ fotoğraf çektim!', is_verified: true },
      { user_id: 8, event_id: 3, rating: 5, comment: 'Tarihi yarımadayı fotoğrafçı gözüyle görmek bambaşka. Tekrarlanmalı.', is_verified: true },
      { user_id: 9, event_id: 4, rating: 4, comment: 'Seramik şekillendirme düşündüğümden zor ama çok eğlenceliydi. Yaptığım vazoyu eve götürdüm.', is_verified: true },
      { user_id: 10, event_id: 5, rating: 5, comment: 'Prof. Çotar\'ın anlatımı çok akıcıydı. 100 yıllık Türk sanatını detaylı öğrendik.', is_verified: true },
      { user_id: 6, event_id: 7, rating: 4, comment: 'Hat sanatı atölyesi çok keyifliydi. Kamış kalemle yazmak meditasyon gibi.', is_verified: true },
      { user_id: 7, artwork_id: 16, rating: 3, comment: 'Karakalem güzel ama fiyatına göre boyutu küçük kaldı.', is_verified: true },
      { user_id: 10, artwork_id: 24, rating: 5, comment: 'Yaşlı Balıkçı Portresi gerçekçiliğiyle hayran bırakıyor. Oğuz Tanrıkulu büyük usta.', is_verified: true },
      { user_id: 8, artwork_id: 5, rating: 5, comment: 'Kapadokya Gün Batımı... Salonumuzun baş köşesinde. Misafirlerimiz hayran kalıyor.', is_verified: true }
    ]);
    console.log('✓ 15 Yorum eklendi');

    // ────────────────────────────────────────
    // REVIEW VOTES (12 oy)
    // ────────────────────────────────────────
    await ReviewVote.bulkCreate([
      { review_id: 1, user_id: 5, is_helpful: true }, { review_id: 1, user_id: 6, is_helpful: true },
      { review_id: 1, user_id: 7, is_helpful: true }, { review_id: 2, user_id: 4, is_helpful: true },
      { review_id: 3, user_id: 9, is_helpful: true }, { review_id: 6, user_id: 5, is_helpful: true },
      { review_id: 6, user_id: 7, is_helpful: true }, { review_id: 8, user_id: 4, is_helpful: true },
      { review_id: 8, user_id: 9, is_helpful: true }, { review_id: 11, user_id: 4, is_helpful: true },
      { review_id: 15, user_id: 6, is_helpful: true }, { review_id: 14, user_id: 9, is_helpful: true }
    ]);
    console.log('✓ 12 Yorum oyu eklendi');

    // ────────────────────────────────────────
    // REVIEW REPLIES (6 yanıt)
    // ────────────────────────────────────────
    await ReviewReply.bulkCreate([
      { review_id: 1, replier_id: 1, reply_text: 'Güzel değerlendirmeniz için teşekkür ederiz! Elif Şahin\'in yeni koleksiyonu yakında galerimizde olacak.' },
      { review_id: 6, replier_id: 2, reply_text: 'Atölyemize katıldığınız için çok teşekkürler! Nisan ayında ileri seviye atölyemiz de olacak.' },
      { review_id: 7, replier_id: 2, reply_text: 'Geri bildiriminiz değerli. Sonraki atölyede kapasite sınırını düşüreceğiz.' },
      { review_id: 8, replier_id: 2, reply_text: 'Harika bir gün geçirdiğimize sevindik! Mayıs ayında Boğaz turu planlanıyor.' },
      { review_id: 13, replier_id: 1, reply_text: 'Görüşünüz için teşekkürler. Farklı boyut seçenekleri üzerinde çalışıyoruz.' },
      { review_id: 15, replier_id: 2, reply_text: 'Can Özdemir\'in bu eserini beğenmenize çok sevindik! Sağlığınıza hayırlı olsun.' }
    ]);
    console.log('✓ 6 Yorum yanıtı eklendi');

    // ────────────────────────────────────────
    // COUPONS (6 kupon)
    // ────────────────────────────────────────
    await Coupon.bulkCreate([
      { code: 'HOSGELDIN10', discount_percent: 10, valid_from: '2026-01-01', valid_until: '2026-12-31', max_uses: 500, used_count: 47, is_user_specific: false },
      { code: 'SANAT20', discount_percent: 20, valid_from: '2026-03-01', valid_until: '2026-06-30', max_uses: 100, used_count: 23, is_user_specific: false },
      { code: 'VIP50', discount_amount: 50, valid_from: '2026-01-01', valid_until: '2026-12-31', max_uses: 20, used_count: 5, is_user_specific: false },
      { code: 'AHMET-OZEL', discount_percent: 15, valid_from: '2026-03-01', valid_until: '2026-06-30', max_uses: 1, used_count: 0, is_user_specific: true, target_user_id: 4 },
      { code: 'BAHAR30', discount_percent: 30, valid_from: '2026-04-01', valid_until: '2026-05-31', max_uses: 200, used_count: 0, is_user_specific: false },
      { code: 'GALERI100', discount_amount: 100, valid_from: '2026-01-01', valid_until: '2026-12-31', max_uses: 50, used_count: 12, is_user_specific: false }
    ]);
    console.log('✓ 6 Kupon eklendi');

    // ────────────────────────────────────────
    // SUPPORT TICKETS (6 talep)
    // ────────────────────────────────────────
    const tickets = await SupportTicket.bulkCreate([
      { user_id: 4, subject: 'Sipariş kargo takibi', message: 'Siparişimi 3 gün önce verdim, henüz kargo bilgisi gelmedi. Takip numarası alabilir miyim?', status: 'resolved' },
      { user_id: 5, subject: 'Eser iadesi', message: 'Aldığım tablonun çerçevesinde küçük bir çizik var. İade veya değişim yapabilir miyiz?', status: 'in_progress' },
      { user_id: 6, subject: 'Etkinlik saati değişikliği', message: 'Fotoğraf gezisinin saati değişti mi? Mail almadım.', status: 'open' },
      { user_id: 7, subject: 'Kupon kodu çalışmıyor', message: 'HOSGELDIN10 kodunu girdim ama indirim uygulanmadı. Yardımcı olur musunuz?', status: 'resolved' },
      { user_id: 8, subject: 'Ödeme sorunu', message: 'Kredi kartımdan çekim yapılamadı ama bakiyem yeterli. Farklı kart deneyebilir miyim?', status: 'open' },
      { user_id: 9, subject: 'Toplu sipariş indirimi', message: '5 adet fotoğraf baskısı almak istiyorum. Toplu alımda indirim var mı?', status: 'in_progress' }
    ]);
    console.log('✓ 6 Destek talebi eklendi');

    // ────────────────────────────────────────
    // SUPPORT MESSAGES (10 mesaj)
    // ────────────────────────────────────────
    await SupportMessage.bulkCreate([
      { ticket_id: 1, sender_id: 4, message_text: 'Siparişimi 3 gün önce verdim, kargo bilgisi alabilir miyim?' },
      { ticket_id: 1, sender_id: 1, message_text: 'Merhaba Ahmet Bey, siparişiniz bugün kargoya verilmiştir. Takip No: TR9876543210. İyi günler!' },
      { ticket_id: 1, sender_id: 4, message_text: 'Teşekkür ederim, takip ediyorum.' },
      { ticket_id: 2, sender_id: 5, message_text: 'Tablonun çerçevesinde bir çizik var, fotoğraf gönderiyorum.' },
      { ticket_id: 2, sender_id: 2, message_text: 'Ayşe Hanım, fotoğrafı aldık. Değişim süreci başlatılmıştır. 3 iş günü içinde yeni ürün adresinize gönderilecektir.' },
      { ticket_id: 3, sender_id: 6, message_text: 'Fotoğraf gezisinin saati değişti mi?' },
      { ticket_id: 4, sender_id: 7, message_text: 'HOSGELDIN10 kodu uygulanmadı.' },
      { ticket_id: 4, sender_id: 1, message_text: 'Zeynep Hanım, kupon kodunu kontrol ettik. Sorun giderildi, tekrar deneyebilirsiniz.' },
      { ticket_id: 5, sender_id: 8, message_text: 'Kredi kartı sorunu yaşıyorum.' },
      { ticket_id: 6, sender_id: 9, message_text: '5 adet fotoğraf baskısı için toplu indirim alabilir miyim?' }
    ]);
    console.log('✓ 10 Destek mesajı eklendi');

    // ────────────────────────────────────────
    // COMPARISONS (4 karşılaştırma)
    // ────────────────────────────────────────
    await Comparison.bulkCreate([
      { user_id: 4, comparison_type: 'artwork', item_ids: [1, 3, 4] },
      { user_id: 5, comparison_type: 'artwork', item_ids: [5, 6, 7] },
      { user_id: 6, comparison_type: 'event', item_ids: [1, 2, 6] },
      { user_id: 7, comparison_type: 'artwork', item_ids: [11, 12, 13, 14] }
    ]);
    console.log('✓ 4 Karşılaştırma eklendi');

    console.log('\\n════════════════════════════════════════');
    console.log('✅ TÜM SEED VERİLERİ BAŞARIYLA YÜKLENDİ!');
    console.log('════════════════════════════════════════');
    console.log('📊 Özet: 10 Kullanıcı | 10 Sanatçı | 8 Kategori | 25 Eser');
    console.log('        10 Etkinlik | 12 Rez. | 8 Sipariş | 15 Yorum');
    console.log('        20 Favori | 6 Kupon | 6 Destek Talebi');
    console.log('\\n🔑 Giriş: herhangi bir e-posta + şifre: password123');
    console.log('   Admin: admin@gallery.com | Manager: manager@gallery.com');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed hatası:', err);
    process.exit(1);
  }
}

seed();
