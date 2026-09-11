# Taskavia

Taskavia, işverenlerle freelancer'ları proje ilanları, teklifler, mesajlaşma ve çalışma takibi etrafında buluşturan bir freelance pazar yeri uygulamasıdır.

> Proje aktif geliştirme aşamasındadır. Ödeme özelliği varsayılan olarak kapalıdır ve canlı finansal işlem için hazır kabul edilmemelidir.

## Özellikler

- İşveren ve freelancer rollerine özel kayıt ve panel akışları
- Kategori bazlı ilan oluşturma, arama ve filtreleme
- İlan taslağı, yayın önizlemesi ve gelişmiş bütçe/tarih sıralaması
- Teklif gönderme, aday sıralama, özel aday notları, kabul ve reddetme
- İş durumu ve tamamlanma takibi
- Katılımcılara özel gerçek zamanlı mesajlaşma
- Okunmamış mesaj ve bildirim yönetimi
- Profil, portföy ve özel erişimli özgeçmiş yükleme
- Karşılıklı değerlendirme akışı
- Profil gizliliği ve hesap ayarları
- Yönetici erişimi ve temel moderasyon işlemleri
- Hassas verileri maskeleyen yapılandırılmış hata kayıtları ve kullanıcı hata referansları

## Teknoloji

- Next.js 16 ve React 19
- TypeScript
- Supabase Auth, PostgreSQL, Storage ve Realtime
- Vinext ve Cloudflare uyumlu üretim derlemesi
- Node.js yerleşik test çalıştırıcısı ve ESLint

## Yerel kurulum

Gereksinimler:

- Node.js 20.9 veya üzeri
- Bir Supabase projesi

```bash
git clone https://github.com/keremmalkann/taskavia.git
cd taskavia
npm ci
cp .env.example .env.local
```

`.env.local` içindeki en az şu değerleri kendi Supabase projenizle doldurun:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Veritabanını hazırlamak için [Supabase kurulum adımlarını](supabase/README.md) izleyin. Ardından geliştirme sunucusunu çalıştırın:

```bash
npm run dev
```

Uygulama varsayılan olarak `http://127.0.0.1:3000` adresinde açılır.

## Kullanılabilir komutlar

```bash
npm run dev          # Next.js geliştirme sunucusu
npm run lint         # ESLint kontrolü
npm run test:unit    # Birim testleri
npm run test:e2e     # İzole Supabase projesinde uçtan uca akış testi
npm run build        # Vinext/Cloudflare üretim derlemesi
npm run build:next   # Next.js üretim derlemesi
```

Uçtan uca test gerçek veritabanına yazdığı için yalnızca ayrı bir test projesinde ve `supabase/README.md` içindeki güvenlik kilitleriyle çalıştırılmalıdır.

## Hata izleme

Beklenmeyen sunucu ve tarayıcı hataları, her olay için benzersiz bir `TVA-...` referansıyla yapılandırılmış JSON loglarına yazılır. Parola, oturum, token, e-posta ve yetkilendirme verileri kaydedilmeden önce maskelenir.

İsteğe bağlı olarak temizlenmiş hata olayları harici bir gözlemleme servisine iletilebilir:

```dotenv
ERROR_REPORTING_WEBHOOK_URL=https://observability.example.com/taskavia-errors
ERROR_REPORTING_WEBHOOK_TOKEN=
```

Webhook tanımlanmadığında yerel ve platform sunucu logları kullanılmaya devam eder.

## Ortam değişkenleri ve güvenlik

- Gerçek `.env` dosyaları Git tarafından takip edilmez; yalnızca `.env.example` paylaşılır.
- `SUPABASE_SERVICE_ROLE_KEY`, Stripe ve Resend anahtarları yalnızca sunucu ortamında tutulmalıdır.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` istemciye açık olacak şekilde tasarlanmıştır; veri güvenliği Supabase RLS politikalarına dayanır.
- Portföy ve özgeçmiş bucket'ları public yapılmamalıdır.
- Yeni migration'lar sırasıyla uygulanmalı ve `supabase/verify_release.sql` sonucu tamamen `OK` olmalıdır.

Bir güvenlik açığı fark ederseniz ayrıntıları herkese açık issue olarak paylaşmayın. [Güvenlik politikası](SECURITY.md) üzerinden bildirin.

## Ödeme durumu

Stripe entegrasyonunun altyapısı geliştirme amaçlı bulunur ancak `PAYMENTS_ENABLED=false` ile kapalıdır. Hukuki, mali ve operasyonel gereksinimler tamamlanmadan canlı ödemeler etkinleştirilmemelidir.

## Lisans

Bu depo şu anda bir açık kaynak lisansı içermemektedir. Kaynak kodun public olarak görüntülenebilmesi; kopyalama, dağıtma veya ticari kullanım izni vermez.
