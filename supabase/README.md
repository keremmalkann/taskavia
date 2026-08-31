# İşlik Supabase kurulumu

1. Supabase Dashboard → SQL Editor bölümünü açın.
2. `migrations/20260828090000_marketplace_core.sql` ve ardından `migrations/20260831170000_private_resumes.sql` dosyalarını çalıştırın.
3. Authentication → URL Configuration altında canlı site adresini izinli yönlendirme adreslerine ekleyin.
4. Storage altında `portfolios` ve özel erişimli `resumes` bucket'larının oluştuğunu doğrulayın.
5. Realtime → Publications altında `messages` tablosunun etkin olduğunu doğrulayın.

Migration; mevcut Auth kullanıcılarını `profiles` tablosuna aktarır, yeni kayıtlar için otomatik profil oluşturur ve tüm ürün tablolarında RLS politikalarını etkinleştirir.

## Stripe Connect

Gerçek ödeme akışı için barındırma ortamına `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` ve `SUPABASE_SERVICE_ROLE_KEY` ekleyin. Stripe webhook adresi:

`https://islik-freelance.keremmalkann.chatgpt.site/api/stripe/webhook`

Checkout ödemesi platform hesabında `funded` olarak tutulur. İşveren işi tamamladıktan sonra panelden serbest bırakıldığında, %10 platform bedeli düşülerek freelancer'ın bağlı Connect hesabına transfer edilir. Canlı kullanımdan önce Stripe'ın ülke, Connect ve emanet benzeri fon tutma kurallarını hukuk/mali danışmanla doğrulayın.
