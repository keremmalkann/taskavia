import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Feedback, MarketplaceShell, SetupNotice } from '@/app/marketplace-shell'
import { SafetyActions } from '@/app/safety-actions'
import { formatCurrency, formatDate } from '@/lib/marketplace'
import { resolvePortfolioUrl } from '@/lib/portfolio-files'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function isPortfolioImage(url: string | null) {
  return Boolean(url && /\.(?:jpe?g|png|webp)(?:\?|$)/i.test(url))
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data: profile } = await supabase.from('profiles').select('full_name, title, role, company_name').eq('id', id).maybeSingle()
  const name = profile?.company_name || profile?.full_name || 'Taskavia profili'
  const description = profile?.title ? `${name} — ${profile.title}` : `${name} Taskavia profili`
  return {
    title: `${name} — Taskavia`,
    description,
    openGraph: { title: `${name} — Taskavia`, description, images: [] },
    twitter: { card: 'summary', title: `${name} — Taskavia`, description, images: [] },
  }
}

export default async function PublicProfilePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; message?: string }> }) {
  const [{ id }, feedback] = await Promise.all([params, searchParams])
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: viewerProfile } = user
    ? await supabase.from('profiles').select('role, full_name').eq('id', user.id).maybeSingle()
    : { data: null }
  const viewerRole = viewerProfile?.role === 'employer' ? 'employer' : 'freelancer'
  const fullName = viewerProfile?.full_name || user?.user_metadata.full_name || user?.email?.split('@')[0] || 'Taskavia üyesi'
  const [{ data: profile, error: profileError }, { data: portfolio }, { data: reviews }, { data: resumeProfile }] = await Promise.all([
    supabase.from('profiles').select('id, role, full_name, company_name, title, bio, skills, hourly_rate, experience_years, portfolio_url, created_at').eq('id', id).maybeSingle(),
    supabase.from('portfolio_items').select('id, title, description, file_url, created_at').eq('profile_id', id).order('created_at', { ascending: false }),
    supabase.from('reviews').select('rating, comment, created_at, reviewer:profiles!reviews_reviewer_id_fkey(full_name, company_name)').eq('reviewee_id', id).order('created_at', { ascending: false }),
    user && (viewerRole === 'employer' || user.id === id) ? supabase.from('profiles').select('resume_path').eq('id', id).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ])

  if (!profile && !profileError) notFound()
  const { data: resumeLink } = resumeProfile?.resume_path
    ? await supabase.storage.from('resumes').createSignedUrl(resumeProfile.resume_path, 60 * 60)
    : { data: null }
  const [portfolioWithUrls, legacyPortfolioUrl] = await Promise.all([
    Promise.all((portfolio ?? []).map(async (item) => ({
      ...item,
      display_url: await resolvePortfolioUrl(supabase, item.file_url),
    }))),
    resolvePortfolioUrl(supabase, profile?.portfolio_url),
  ])
  const average = reviews?.length ? (reviews.reduce((sum, review) => sum + Number(review.rating), 0) / reviews.length).toFixed(1) : null
  const isOwnProfile = user?.id === id
  const { data: block } = user && !isOwnProfile
    ? await supabase.from('user_blocks').select('blocked_id').eq('blocker_id', user.id).eq('blocked_id', id).maybeSingle()
    : { data: null }
  const displayName = profile?.role === 'employer' ? profile.company_name || profile.full_name : profile?.full_name

  const content = <>
    {profileError && <SetupNotice />}
    {profile && <>
      <header className="public-profile-hero">
        <div className="public-profile-avatar">{profile.full_name.slice(0, 2).toLocaleUpperCase('tr-TR')}</div>
        <div className="public-profile-identity"><span>{profile.role === 'freelancer' ? 'FREELANCER PROFİLİ' : 'İŞVEREN PROFİLİ'}</span><h1>{displayName}</h1><p>{profile.title || (profile.role === 'freelancer' ? 'Freelancer' : 'İşveren')}</p></div>
        <div className="public-profile-actions">{isOwnProfile ? <Link className="primary" href="/profile">Profili düzenle →</Link> : user ? <><Link href={viewerRole === 'employer' ? '/employer' : '/jobs'}>Geri dön →</Link><SafetyActions compact returnPath={`/profiles/${id}`} subjectType="user" subjectId={id} targetUserId={id} blockedByMe={Boolean(block)} /></> : <Link className="primary" href="/signup">Taskavia&apos;ya katıl →</Link>}</div>
      </header>

      <section className={`public-profile-stats ${profile.role === 'employer' ? 'employer' : ''}`}>
        {profile.role === 'freelancer' ? <>
          <div><small>DENEYİM</small><strong>{profile.experience_years != null ? `${profile.experience_years} yıl` : '—'}</strong></div>
          <div><small>SAATLİK ÜCRET</small><strong>{profile.hourly_rate != null ? formatCurrency(profile.hourly_rate) : '—'}</strong></div>
          <div><small>PUAN</small><strong>{average ? `★ ${average}` : 'Yeni'}</strong><span>{reviews?.length ?? 0} değerlendirme</span></div>
          <div><small>PORTFÖY</small><strong>{portfolioWithUrls.length}</strong><span>yayınlanmış çalışma</span></div>
        </> : <>
          <div><small>ŞİRKET / KİŞİ</small><strong>{profile.company_name || profile.full_name}</strong></div>
          <div><small>YETKİLİ</small><strong>{profile.full_name}</strong></div>
          <div><small>TASKAVIA ÜYESİ</small><strong>{formatDate(profile.created_at)}</strong></div>
        </>}
      </section>

      <div className="public-profile-body">
        <main>
          <section className="public-profile-about"><span>HAKKINDA</span><h2>{profile.role === 'freelancer' ? 'Çalışma yaklaşımı' : 'Şirket hakkında'}</h2><p>{profile.bio || 'Bu profil henüz hakkında bilgisi eklemedi.'}</p>{profile.role === 'freelancer' && <div className="public-profile-skills">{profile.skills?.length ? profile.skills.map((skill: string) => <span key={skill}>{skill}</span>) : <span>Henüz beceri eklenmedi</span>}</div>}</section>

          {profile.role === 'freelancer' && <section className="public-portfolio-section"><div className="dashboard-section-title"><div><p>SEÇİLİ ÇALIŞMALAR</p><h2>Portföy</h2></div><span>{portfolioWithUrls.length} çalışma</span></div><div className="public-portfolio-grid">
            {portfolioWithUrls.map((item) => <a key={item.id} href={item.display_url || '#'} target="_blank" rel="noreferrer" aria-disabled={!item.display_url}><div className={`public-portfolio-media ${isPortfolioImage(item.display_url) ? '' : 'document'}`}>{isPortfolioImage(item.display_url) && item.display_url ? <Image src={item.display_url} width={800} height={500} alt={item.title} /> : <><strong>{item.display_url ? 'PDF' : '!'}</strong><span>{item.display_url ? 'Dosyayı incele ↗' : 'Dosya erişilemiyor'}</span></>}</div><div><h3>{item.title}</h3><p>{item.description || 'Açıklama eklenmedi.'}</p><small>{formatDate(item.created_at)}</small></div></a>)}
            {portfolioWithUrls.length === 0 && <div className="marketplace-empty public-portfolio-empty"><strong>Henüz çalışma eklenmedi.</strong><p>Portföy çalışmaları yayınlandığında burada görünecek.</p></div>}
          </div></section>}
        </main>

        <aside className="public-reviews"><span>DEĞERLENDİRMELER</span><h2>{average ? `${average} / 5` : 'Henüz puan yok'}</h2><p>{reviews?.length ?? 0} doğrulanmış iş değerlendirmesi</p>{resumeLink?.signedUrl && <a className="public-resume-link" href={resumeLink.signedUrl} target="_blank" rel="noreferrer"><strong>PDF</strong><span>Özgeçmişi görüntüle ↗</span><small>Bağlantı 1 saat geçerlidir</small></a>}<div>{reviews?.length ? reviews.map((review, index) => { const reviewer = Array.isArray(review.reviewer) ? review.reviewer[0] : review.reviewer; return <article key={index}><strong>{'★'.repeat(review.rating)}</strong><p>{review.comment || 'Yorum bırakılmadı.'}</p><small>{reviewer?.company_name || reviewer?.full_name || 'Taskavia kullanıcısı'} · {formatDate(review.created_at)}</small></article> }) : <div className="public-review-empty">İlk tamamlanan işten sonra değerlendirmeler burada görünecek.</div>}</div>{legacyPortfolioUrl && <a href={legacyPortfolioUrl} target="_blank" rel="noreferrer">Önceki portföy dosyasını aç ↗</a>}</aside>
      </div>
    </>}
  </>

  if (user) {
    return <MarketplaceShell name={fullName} role={viewerRole} active={isOwnProfile ? 'profile' : viewerRole === 'employer' ? 'dashboard' : 'jobs'}><Feedback {...feedback} />{content}</MarketplaceShell>
  }

  return <main className="public-profile-guest"><nav className="site-nav" aria-label="Ana navigasyon"><Link className="brand" href="/" aria-label="Taskavia ana sayfa"><span className="brand-mark" aria-hidden="true">t</span><span>taskavia</span></Link><div className="nav-actions"><Link className="text-link" href="/login">Giriş yap</Link><Link className="button button-dark button-small" href="/signup">Ücretsiz katıl <span aria-hidden="true">↗</span></Link></div></nav><div className="public-profile-guest-content">{content}</div></main>
}
