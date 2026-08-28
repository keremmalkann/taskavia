import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketplaceShell, Feedback, SetupNotice } from '@/app/marketplace-shell'
import { updateProfile } from '@/lib/actions/marketplace'
import { requireUser } from '@/lib/auth/role'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Profilim — İşlik', description: 'İşlik profil bilgilerini, yeteneklerini ve portföyünü yönet.' }

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const params = await searchParams
  const { supabase, user, role, fullName } = await requireUser()
  const [{ data: profile, error: profileError }, { data: reviews }, { data: portfolio }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('reviews').select('rating, comment, created_at, reviewer:profiles!reviews_reviewer_id_fkey(full_name)').eq('reviewee_id', user.id).order('created_at', { ascending: false }).limit(5),
    supabase.from('portfolio_items').select('*').eq('profile_id', user.id).order('created_at', { ascending: false }),
  ])
  const average = reviews?.length ? (reviews.reduce((sum, review) => sum + Number(review.rating), 0) / reviews.length).toFixed(1) : null

  return (
    <MarketplaceShell name={profile?.full_name ?? fullName} role={role} active="profile">
      <div className="marketplace-page-head"><div><p>HESAP & PORTFÖY</p><h1>Profilini tamamla.</h1><span>Doğru bilgiler, daha iyi eşleşmeler ve daha güçlü bir güven profili oluşturur.</span></div><Link href={role === 'employer' ? '/employer' : '/freelancer'}>Panele dön →</Link></div>
      <Feedback {...params} />
      {profileError && <SetupNotice />}
      <div className="profile-layout">
        <form action={updateProfile} className="marketplace-form" encType="multipart/form-data">
          <div className="form-section-title"><span>01</span><div><h2>Temel bilgiler</h2><p>Profilinde görünen kişisel veya şirket bilgilerin.</p></div></div>
          <div className="form-grid two"><label>Ad Soyad<input name="fullName" required minLength={2} defaultValue={profile?.full_name ?? fullName} /></label><label>{role === 'employer' ? 'Pozisyon' : 'Uzmanlık başlığı'}<input name="title" defaultValue={profile?.title ?? ''} placeholder={role === 'employer' ? 'Kurucu, İnsan Kaynakları…' : 'Product Designer, Frontend Developer…'} /></label></div>
          {role === 'employer' && <label>Şirket adı<input name="companyName" defaultValue={profile?.company_name ?? ''} placeholder="Şirket veya marka adı" /></label>}
          <label>Hakkında<textarea name="bio" rows={5} defaultValue={profile?.bio ?? ''} placeholder="Deneyimini, çalışma biçimini ve hedeflerini anlat." /></label>
          {role === 'freelancer' && <>
            <div className="form-section-title"><span>02</span><div><h2>Uzmanlık & ücret</h2><p>İşverenlerin seni doğru projelerle eşleştirmesini sağlar.</p></div></div>
            <label>Yetenekler<input name="skills" defaultValue={profile?.skills?.join(', ') ?? ''} placeholder="Figma, React, Marka Stratejisi (virgülle ayır)" /></label>
            <div className="form-grid two"><label>Saatlik ücret (₺)<input name="hourlyRate" type="number" min="0" defaultValue={profile?.hourly_rate ?? ''} /></label><label>Deneyim (yıl)<input name="experienceYears" type="number" min="0" defaultValue={profile?.experience_years ?? ''} /></label></div>
            <div className="form-section-title"><span>03</span><div><h2>Portföy & ödeme</h2><p>PDF veya görsel yükle; ödeme için Stripe Connect hesabını bağla.</p></div></div>
            <label>Portföy dosyası<input name="portfolioFile" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" /></label>
            <label>Stripe Connect hesap kimliği<input name="stripeAccountId" defaultValue={profile?.stripe_account_id ?? ''} placeholder="acct_..." /></label>
          </>}
          <button className="marketplace-submit" type="submit">Profili kaydet →</button>
        </form>
        <aside className="profile-preview">
          <span className="profile-preview-label">PROFİL ÖNİZLEMESİ</span><div className="profile-large-avatar">{(profile?.full_name ?? fullName).slice(0, 2).toLocaleUpperCase('tr-TR')}</div><h2>{profile?.full_name ?? fullName}</h2><p>{profile?.title ?? (role === 'employer' ? 'İşveren' : 'Freelancer')}</p>
          {role === 'freelancer' && <div className="profile-mini-stats"><div><strong>{profile?.experience_years ?? 0}</strong><span>yıl deneyim</span></div><div><strong>{profile?.hourly_rate ? `₺${profile.hourly_rate}` : '—'}</strong><span>saatlik</span></div><div><strong>{average ?? 'Yeni'}</strong><span>puan</span></div></div>}
          {profile?.portfolio_url && <a className="profile-file-link" href={profile.portfolio_url} target="_blank" rel="noreferrer">Portföy dosyasını aç ↗</a>}
          {portfolio && portfolio.length > 0 && <div className="profile-portfolio-count">{portfolio.length} portföy çalışması</div>}
          <div className="profile-review-list"><h3>Son değerlendirmeler</h3>{reviews?.length ? reviews.map((review, index) => <article key={index}><strong>{'★'.repeat(review.rating)}</strong><p>{review.comment || 'Yorum bırakılmadı.'}</p></article>) : <p>Henüz değerlendirme yok.</p>}</div>
        </aside>
      </div>
    </MarketplaceShell>
  )
}
