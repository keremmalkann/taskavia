import type { Metadata } from 'next'
import Link from 'next/link'
import { Feedback, MarketplaceShell } from '@/app/marketplace-shell'
import { changePassword, signOutEverywhere, updateSettings } from '@/lib/actions/settings'
import { requireUser } from '@/lib/auth/role'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Ayarlar — İşlik', description: 'İşlik hesap, bildirim, gizlilik ve güvenlik ayarlarını yönet.' }

type Settings = {
  notifications?: { messages?: boolean; project_updates?: boolean; opportunities?: boolean; weekly_digest?: boolean; marketing?: boolean }
  privacy?: { profile_visibility?: 'public' | 'members'; show_activity?: boolean; show_completed_jobs?: boolean }
}

function Toggle({ name, title, description, defaultChecked }: { name: string; title: string; description: string; defaultChecked: boolean }) {
  return <label className="settings-toggle"><span><strong>{title}</strong><small>{description}</small></span><input name={name} type="checkbox" defaultChecked={defaultChecked} /><i aria-hidden="true" /></label>
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const params = await searchParams
  const { user, role, fullName } = await requireUser()
  const settings = (user.user_metadata.settings ?? {}) as Settings
  const notifications = settings.notifications ?? {}
  const privacy = settings.privacy ?? {}
  const joinedAt = new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric', timeZone: 'Europe/Istanbul' }).format(new Date(user.created_at))

  return <MarketplaceShell name={fullName} role={role} active="settings">
    <div className="marketplace-page-head"><div><p>HESAP AYARLARI</p><h1>Kontrol sende.</h1><span>Bildirimlerini, görünürlüğünü ve hesap güvenliğini tek yerden yönet.</span></div><Link href="/profile">Profili düzenle →</Link></div>
    <Feedback {...params} />
    <div className="settings-layout">
      <div className="settings-main">
        <form action={updateSettings} className="settings-card">
          <div className="settings-card-head"><span>01</span><div><h2>Bildirimler</h2><p>İşlik’ten hangi gelişmeler için haber almak istediğini seç.</p></div></div>
          <div className="settings-options">
            <Toggle name="notifyMessages" title="Yeni mesajlar" description="Bir işveren veya freelancer sana mesaj gönderdiğinde haber ver." defaultChecked={notifications.messages ?? true} />
            <Toggle name="notifyProjectUpdates" title="Proje ve teklif güncellemeleri" description={role === 'employer' ? 'İlanlarına yeni teklif geldiğinde ve iş durumu değiştiğinde bildir.' : 'Tekliflerin kabul edildiğinde veya iş durumu değiştiğinde bildir.'} defaultChecked={notifications.project_updates ?? true} />
            <Toggle name="notifyOpportunities" title={role === 'employer' ? 'Yetenek önerileri' : 'Yeni iş fırsatları'} description={role === 'employer' ? 'İlanlarınla eşleşen freelancer önerilerini al.' : 'Yeteneklerinle eşleşen yeni ilanlardan haberdar ol.'} defaultChecked={notifications.opportunities ?? true} />
            <Toggle name="notifyWeeklyDigest" title="Haftalık özet" description="Haftanın fırsatlarını ve hesap hareketlerini tek e-postada al." defaultChecked={notifications.weekly_digest ?? true} />
            <Toggle name="notifyMarketing" title="Ürün haberleri" description="Yeni özellikler, etkinlikler ve İşlik duyurularını al." defaultChecked={notifications.marketing ?? false} />
          </div>

          <div className="settings-card-head settings-card-section"><span>02</span><div><h2>Gizlilik</h2><p>Diğer kullanıcıların profilinde neleri görebileceğini belirle.</p></div></div>
          <label className="settings-select">Profil görünürlüğü<select name="profileVisibility" defaultValue={privacy.profile_visibility ?? 'public'}><option value="public">Herkese açık</option><option value="members">Yalnızca İşlik üyeleri</option></select><small>Profilin arama ve freelancer listelerinde kimlere gösterilsin?</small></label>
          <div className="settings-options">
            <Toggle name="showActivity" title="Aktiflik durumunu göster" description="Yakın zamanda aktif olduğunu diğer İşlik üyeleri görebilsin." defaultChecked={privacy.show_activity ?? true} />
            <Toggle name="showCompletedJobs" title="Tamamlanan işleri göster" description="Tamamlanan proje sayın güven profiline dahil edilsin." defaultChecked={privacy.show_completed_jobs ?? true} />
          </div>

          <div className="settings-card-head settings-card-section"><span>03</span><div><h2>Dil & bölge</h2><p>İşlik hesabının yerel gösterim tercihleri.</p></div></div>
          <div className="settings-region-grid"><div><small>DİL</small><strong>Türkçe</strong></div><div><small>PARA BİRİMİ</small><strong>Türk Lirası (₺)</strong></div><div><small>SAAT DİLİMİ</small><strong>İstanbul</strong></div></div>
          <button className="marketplace-submit settings-save" type="submit">Ayarları kaydet →</button>
        </form>

        <section className="settings-card">
          <div className="settings-card-head"><span>04</span><div><h2>Güvenlik</h2><p>Şifreni yenile ve açık oturumlarını kontrol et.</p></div></div>
          <form action={changePassword} className="settings-password-form"><label>Yeni şifre<input name="password" type="password" minLength={8} autoComplete="new-password" required placeholder="En az 8 karakter" /></label><label>Yeni şifre tekrar<input name="passwordConfirmation" type="password" minLength={8} autoComplete="new-password" required placeholder="Şifreni tekrar yaz" /></label><button type="submit">Şifreyi değiştir</button></form>
          <div className="settings-session"><div><strong>Tüm cihazlardaki oturumlar</strong><small>Hesabının açık olduğu diğer cihazlardan güvenli şekilde çıkış yap.</small></div><form action={signOutEverywhere}><button type="submit">Tüm oturumları kapat</button></form></div>
        </section>
      </div>

      <aside className="settings-account-card">
        <span className="profile-preview-label">HESAP ÖZETİ</span>
        <div className="settings-account-avatar">{fullName.slice(0, 2).toLocaleUpperCase('tr-TR')}</div>
        <h2>{fullName}</h2><p>{role === 'employer' ? 'İşveren hesabı' : 'Freelancer hesabı'}</p>
        <dl><div><dt>E-posta</dt><dd>{user.email}</dd></div><div><dt>E-posta durumu</dt><dd className={user.email_confirmed_at ? 'verified' : ''}>{user.email_confirmed_at ? 'Doğrulandı' : 'Doğrulanmadı'}</dd></div><div><dt>Üyelik</dt><dd>{joinedAt}</dd></div></dl>
        <Link href="/profile">Profil bilgilerini düzenle →</Link>
      </aside>
    </div>
  </MarketplaceShell>
}
