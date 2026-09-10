import type { Metadata } from 'next'
import Link from 'next/link'
import { Feedback, MarketplaceShell } from '@/app/marketplace-shell'
import { PendingSubmitButton } from '@/app/pending-submit-button'
import { changePassword, deleteAccount, signOutEverywhere, updateSettings } from '@/lib/actions/settings'
import { isAdminEmail } from '@/lib/auth/admin'
import { requireUser } from '@/lib/auth/role'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Ayarlar — Taskavia', description: 'Taskavia hesap, bildirim, gizlilik ve güvenlik ayarlarını yönet.' }

type Settings = {
  notifications?: { messages?: boolean; project_updates?: boolean; opportunities?: boolean; weekly_digest?: boolean; marketing?: boolean }
  privacy?: { profile_visibility?: 'public' | 'members'; show_activity?: boolean; show_completed_jobs?: boolean }
}

function Toggle({ name, title, description, defaultChecked }: { name: string; title: string; description: string; defaultChecked: boolean }) {
  return <label className="settings-toggle"><span><strong>{title}</strong><small>{description}</small></span><input name={name} type="checkbox" defaultChecked={defaultChecked} /><i aria-hidden="true" /></label>
}

function AccordionSummary({ number, title, description, status }: { number: string; title: string; description: string; status: string }) {
  return <summary className="settings-accordion-summary"><span className="settings-accordion-number">{number}</span><div><h2>{title}</h2><p>{description}</p></div><strong>{status}</strong><i aria-hidden="true">⌄</i></summary>
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const params = await searchParams
  const { supabase, user, role, fullName } = await requireUser()
  const { data: privacyProfile } = await supabase
    .from('profiles')
    .select('profile_visibility, show_activity, show_completed_jobs')
    .eq('id', user.id)
    .maybeSingle()
  const settings = (user.user_metadata.settings ?? {}) as Settings
  const notifications = settings.notifications ?? {}
  const privacy = settings.privacy ?? {}
  const notificationValues = [notifications.messages ?? true, notifications.project_updates ?? true, notifications.opportunities ?? true, notifications.weekly_digest ?? true, notifications.marketing ?? false]
  const enabledNotificationCount = notificationValues.filter(Boolean).length
  const profileVisibility = privacyProfile?.profile_visibility ?? privacy.profile_visibility ?? 'public'
  const showActivity = privacyProfile?.show_activity ?? privacy.show_activity ?? true
  const showCompletedJobs = privacyProfile?.show_completed_jobs ?? privacy.show_completed_jobs ?? true
  const privacyStatus = profileVisibility === 'members' ? 'Yalnızca üyeler' : 'Herkese açık'
  const joinedAt = new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric', timeZone: 'Europe/Istanbul' }).format(new Date(user.created_at))
  const isAdmin = isAdminEmail(user.email)

  return <MarketplaceShell name={fullName} role={role} active="settings">
    <div className="marketplace-page-head"><div><p>HESAP AYARLARI</p><h1>Kontrol sende.</h1><span>Bildirimlerini, görünürlüğünü ve hesap güvenliğini tek yerden yönet.</span></div><Link href="/profile">Profili düzenle →</Link></div>
    <Feedback {...params} />
    <div className="settings-layout">
      <div className="settings-main">
        <form id="preferences-form" action={updateSettings} className="settings-card settings-preferences-card">
          <div className="settings-preferences-intro"><span>TERCİHLER</span><h2>Hesabını kendine göre düzenle.</h2><p>Başlıklara dokunarak ayrıntıları açabilir, seçimlerini tek seferde kaydedebilirsin.</p></div>

          <details className="settings-accordion">
            <AccordionSummary number="01" title="Bildirimler" description="Mesaj, proje ve fırsat haberlerini yönet." status={`${enabledNotificationCount}/5 açık`} />
            <div className="settings-accordion-body"><p className="settings-email-note">{process.env.RESEND_API_KEY && process.env.EMAIL_FROM ? 'Etkin bildirimler, hesabındaki doğrulanmış e-posta adresine gönderilir.' : 'E-posta bildirimleri hazır. Gönderimin başlaması için yönetici tarafından e-posta servisinin bağlanması gerekiyor.'}</p><div className="settings-options">
              <Toggle name="notifyMessages" title="Yeni mesajlar" description="Bir işveren veya freelancer sana mesaj gönderdiğinde haber ver." defaultChecked={notifications.messages ?? true} />
              <Toggle name="notifyProjectUpdates" title="Proje ve teklif güncellemeleri" description={role === 'employer' ? 'İlanlarına yeni teklif geldiğinde ve iş durumu değiştiğinde bildir.' : 'Tekliflerin kabul edildiğinde veya iş durumu değiştiğinde bildir.'} defaultChecked={notifications.project_updates ?? true} />
              <Toggle name="notifyOpportunities" title={role === 'employer' ? 'Yetenek önerileri' : 'Yeni iş fırsatları'} description={role === 'employer' ? 'İlanlarınla eşleşen freelancer önerilerini al.' : 'Yeteneklerinle eşleşen yeni ilanlardan haberdar ol.'} defaultChecked={notifications.opportunities ?? true} />
              <Toggle name="notifyWeeklyDigest" title="Haftalık özet" description="Haftanın fırsatlarını ve hesap hareketlerini tek e-postada al." defaultChecked={notifications.weekly_digest ?? true} />
              <Toggle name="notifyMarketing" title="Ürün haberleri" description="Yeni özellikler, etkinlikler ve Taskavia duyurularını al." defaultChecked={notifications.marketing ?? false} />
            </div></div>
          </details>

          <details className="settings-accordion">
            <AccordionSummary number="02" title="Gizlilik" description="Profilinin görünürlüğünü ve hareketlerini belirle." status={privacyStatus} />
            <div className="settings-accordion-body">
              <label className="settings-select">Profil görünürlüğü<select name="profileVisibility" defaultValue={profileVisibility}><option value="public">Herkese açık</option><option value="members">Yalnızca Taskavia üyeleri</option></select><small>Herkese açık profiller giriş yapmadan görüntülenebilir. Üyelere özel profiller ve dosyaları yalnızca oturum açmış kullanıcılar tarafından görülebilir.</small></label>
              <div className="settings-options">
                <Toggle name="showActivity" title="Aktiflik durumunu göster" description="Yakın zamanda aktif olduğunu diğer Taskavia üyeleri görebilsin." defaultChecked={showActivity} />
                <Toggle name="showCompletedJobs" title="Tamamlanan işleri göster" description="Tamamlanan proje sayın güven profiline dahil edilsin." defaultChecked={showCompletedJobs} />
              </div>
            </div>
          </details>

          <details className="settings-accordion">
            <AccordionSummary number="03" title="Dil & bölge" description="Dil, para birimi ve saat dilimi tercihlerini gör." status="Türkçe · ₺" />
            <div className="settings-accordion-body settings-locale-body"><div className="settings-region-grid"><div><small>DİL</small><strong>Türkçe</strong></div><div><small>PARA BİRİMİ</small><strong>Türk Lirası (₺)</strong></div><div><small>SAAT DİLİMİ</small><strong>İstanbul</strong></div></div></div>
          </details>
        </form>

        <details className="settings-card settings-accordion settings-security-card">
          <AccordionSummary number="04" title="Güvenlik" description="Şifreni yenile ve açık oturumlarını kontrol et." status="Şifre & oturum" />
          <div className="settings-accordion-body settings-security-body">
            <form action={changePassword} className="settings-password-form"><label>Yeni şifre<input name="password" type="password" minLength={8} autoComplete="new-password" required placeholder="En az 8 karakter" /></label><label>Yeni şifre tekrar<input name="passwordConfirmation" type="password" minLength={8} autoComplete="new-password" required placeholder="Şifreni tekrar yaz" /></label><PendingSubmitButton pendingLabel="Şifre değiştiriliyor…">Şifreyi değiştir</PendingSubmitButton></form>
            <div className="settings-session"><div><strong>Tüm cihazlardaki oturumlar</strong><small>Hesabının açık olduğu diğer cihazlardan güvenli şekilde çıkış yap.</small></div><form action={signOutEverywhere}><PendingSubmitButton pendingLabel="Oturumlar kapatılıyor…">Tüm oturumları kapat</PendingSubmitButton></form></div>
          </div>
        </details>
        <footer className="settings-save-bar">
          <button className="marketplace-submit settings-save" type="submit" form="preferences-form">Değişiklikleri kaydet →</button>
        </footer>
      </div>

      <aside className="settings-account-card">
        <div className="settings-account-top"><span className="profile-preview-label">HESAP ÖZETİ</span><div className="settings-account-actions"><strong>AKTİF</strong><details className="settings-delete-menu"><summary>Hesabı sil</summary><div><strong>Hesabı kalıcı olarak sil</strong><p>Bu işlem profilini ve tüm hesap verilerini geri alınamaz şekilde kaldırır.</p><form action={deleteAccount}><label>Onaylamak için <b>HESABIMI SİL</b> yaz<input name="confirmation" type="text" autoComplete="off" required placeholder="HESABIMI SİL" /></label><PendingSubmitButton pendingLabel="Hesap siliniyor…">Hesabımı sil</PendingSubmitButton></form></div></details></div></div>
        <div className="settings-account-avatar">{fullName.slice(0, 2).toLocaleUpperCase('tr-TR')}</div>
        <h2>{fullName}</h2><p>{role === 'employer' ? 'İşveren hesabı' : 'Freelancer hesabı'}</p>
        <div className="settings-account-tags"><span>{role === 'employer' ? 'İşveren' : 'Freelancer'}</span><span>{user.email_confirmed_at ? 'E-posta doğrulandı' : 'Doğrulama bekliyor'}</span></div>
        <dl><div><dt>E-posta</dt><dd>{user.email}</dd></div><div><dt>E-posta durumu</dt><dd className={user.email_confirmed_at ? 'verified' : ''}>{user.email_confirmed_at ? 'Doğrulandı' : 'Doğrulanmadı'}</dd></div><div><dt>Üyelik</dt><dd>{joinedAt}</dd></div></dl>
        {isAdmin && <Link className="settings-admin-link" href="/admin">Yönetim panelini aç →</Link>}<Link href="/profile">Profil bilgilerini düzenle →</Link>
      </aside>
    </div>
  </MarketplaceShell>
}
