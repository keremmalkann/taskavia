# Taskavia Supabase kurulumu

1. Supabase Dashboard → SQL Editor bölümünü açın.
2. Aşağıdaki migration dosyalarını **verilen sırayla** çalıştırın:
   1. `migrations/20260828090000_marketplace_core.sql`
   2. `migrations/20260831170000_private_resumes.sql`
   3. `migrations/20260904150000_proposal_management.sql`
   4. `migrations/20260909000000_flow_integrity.sql`
   5. `migrations/20260909120000_job_management.sql`
   6. `migrations/20260910120000_profile_privacy.sql`
   7. `migrations/20260910150000_safe_job_archiving.sql`
   8. `migrations/20260910180000_job_search.sql`
   9. `migrations/20260911120000_abuse_protection.sql`
   10. `migrations/20260911160000_candidate_notes.sql`
3. Authentication → URL Configuration altında canlı site adresini izinli yönlendirme adreslerine ekleyin.
4. Storage altında özel erişimli `portfolios` ve `resumes` bucket'larının oluştuğunu doğrulayın. Portföy bağlantıları profil görünürlüğüne göre süreli olarak imzalanır; bucket public bırakılmamalıdır.
5. Realtime → Publications altında `messages` tablosunun etkin olduğunu doğrulayın.
6. Barındırma ortamında anonim giriş/kayıt limitleri için uzun ve rastgele bir `RATE_LIMIT_SECRET` tanımlayın. `SUPABASE_SERVICE_ROLE_KEY` yalnızca sunucuda tutulmalıdır.
7. Son olarak SQL Editor'de `verify_release.sql` dosyasını çalıştırın. Sonuçtaki bütün `status` alanları `OK` olmalıdır. `MISSING` bulunan bir ortam yayınlanmamalıdır.

Yeni bir migration eklendiğinde bu liste ve `verify_release.sql` birlikte güncellenmelidir. Migration'ları atlamak; ilan durum geçişlerinde, teklif kabul/ret işlemlerinde veya dosya erişiminde çalışma zamanı hatalarına yol açar.

## Yayın öncesi kontrol

1. Migration'ları önce canlıdan ayrı bir Supabase test projesinde doğrulayın.
2. `npm run lint`, `npm run test:unit` ve `npm run build` komutlarının tamamının başarılı olduğunu kontrol edin.
3. Tarayıcı uçtan uca testi geçici veri oluşturur ve sonunda temizler; yine de yalnızca izole test projesinde çalıştırılmalıdır. Test ortamının `SUPABASE_SERVICE_ROLE_KEY` değerini ayarlayın ve `TASKAVIA_E2E_ALLOW_REMOTE_WRITE=true TASKAVIA_E2E_PROJECT_REF=<test-project-ref> npm run test:e2e` komutunu kullanın. Project ref hedef URL ile birebir eşleşmezse test başlamaz. Veri katmanı ve RLS probları ayrıca `npm run test:e2e:api` ile çalıştırılabilir.
4. `verify_release.sql` sonucunda `MISSING` satırı olmadığını doğrulayın.
5. Canlı ortam değişkenlerini ve Authentication yönlendirme adreslerini kontrol ettikten sonra uygulamayı yayınlayın.

Migration; mevcut Auth kullanıcılarını `profiles` tablosuna aktarır, yeni kayıtlar için otomatik profil oluşturur ve tüm ürün tablolarında RLS politikalarını etkinleştirir.

## Stripe Connect

Ödeme özelliği geliştirme aşamasında varsayılan olarak kapalıdır. Hukuki, mali ve operasyonel kontroller tamamlandıktan sonra barındırma ortamına `PAYMENTS_ENABLED=true`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` ve `SUPABASE_SERVICE_ROLE_KEY` ekleyin. Stripe webhook adresi:

`https://islik-freelance.keremmalkann.chatgpt.site/api/stripe/webhook`

Checkout ödemesi platform hesabında `funded` olarak tutulur. İşveren işi tamamladıktan sonra panelden serbest bırakıldığında, %10 platform bedeli düşülerek freelancer'ın bağlı Connect hesabına transfer edilir. Canlı kullanımdan önce Stripe'ın ülke, Connect ve emanet benzeri fon tutma kurallarını hukuk/mali danışmanla doğrulayın.
