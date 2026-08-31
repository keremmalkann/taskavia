import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MarketplaceShell, SetupNotice } from '@/app/marketplace-shell'
import { requireUser } from '@/lib/auth/role'
import { formatCurrency, formatDate } from '@/lib/marketplace'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function isPortfolioImage(url: string | null) {
  return Boolean(url && /\.(?:jpe?g|png|webp)(?:\?|$)/i.test(url))
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data: profile } = await supabase.from('profiles').select('full_name, title, role, company_name').eq('id', id).maybeSingle()
  const name = profile?.company_name || profile?.full_name || 'İşlik profili'
  const description = profile?.title ? `${name} — ${profile.title}` : `${name} İşlik profili`
  return {
    title: `${name} — İşlik`,
    description,
    openGraph: { title: `${name} — İşlik`, description, images: [] },
    twitter: { card: 'summary', title: `${name} — İşlik`, description, images: [] },
  }
}

export default async function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, user, role: viewerRole, fullName } = await requireUser()
  const [{ data: profile, error: profileError }, { data: portfolio }, { data: reviews }] = await Promise.all([
    supabase.from('profiles').select('id, role, full_name, company_name, title, bio, skills, hourly_rate, experience_years, portfolio_url, created_at').eq('id', id).maybeSingle(),
    supabase.from('portfolio_items').select('id, title, description, file_url, created_at').eq('profile_id', id).order('created_at', { ascending: false }),
    supabase.from('reviews').select('rating, comment, created_at, reviewer:profiles!reviews_reviewer_id_fkey(full_name, company_name)').eq('reviewee_id', id).order('created_at', { ascending: false }),
  ])

  if (!profile && !profileError) notFound()
  const average = reviews?.length ? (reviews.reduce((sum, review) => sum + Number(review.rating), 0) / reviews.length).toFixed(1) : null
  const isOwnProfile = user.id === id
  const displayName = profile?.role === 'employer' ? profile.company_name || profile.full_name : profile?.full_name

  return <MarketplaceShell name={fullName} role={viewerRole} active={isOwnProfile ? 'profile' : viewerRole === 'employer' ? 'dashboard' : 'jobs'}>
    {profileError && <SetupNotice />}
    {profile && <>
      <header className="public-profile-hero">
        <div className="public-profile-avatar">{profile.full_name.slice(0, 2).toLocaleUpperCase('tr-TR')}</div>
        <div className="public-profile-identity"><span>{profile.role === 'freelancer' ? 'FREELANCER PROFİLİ' : 'İŞVEREN PROFİLİ'}</span><h1>{displayName}</h1><p>{profile.title || (profile.role === 'freelancer' ? 'Freelancer' : 'İşveren')}</p></div>
        <div className="public-profile-actions">{isOwnProfile ? <Link className="primary" href="/profile">Profili düzenle →</Link> : <Link href={viewerRole === 'employer' ? '/employer' : '/jobs'}>Geri dön →</Link>}</div>
      </header>

      <section className={`public-profile-stats ${profile.role === 'employer' ? 'employer' : ''}`}>
        {profile.role === 'freelancer' ? <>
          <div><small>DENEYİM</small><strong>{profile.experience_years != null ? `${profile.experience_years} yıl` : '—'}</strong></div>
          <div><small>SAATLİK ÜCRET</small><strong>{profile.hourly_rate != null ? formatCurrency(profile.hourly_rate) : '—'}</strong></div>
          <div><small>PUAN</small><strong>{average ? `★ ${average}` : 'Yeni'}</strong><span>{reviews?.length ?? 0} değerlendirme</span></div>
          <div><small>PORTFÖY</small><strong>{portfolio?.length ?? 0}</strong><span>yayınlanmış çalışma</span></div>
        </> : <>
          <div><small>ŞİRKET / KİŞİ</small><strong>{profile.company_name || profile.full_name}</strong></div>
          <div><small>YETKİLİ</small><strong>{profile.full_name}</strong></div>
          <div><small>İŞLİK ÜYESİ</small><strong>{formatDate(profile.created_at)}</strong></div>
        </>}
      </section>

      <div className="public-profile-body">
        <main>
          <section className="public-profile-about"><span>HAKKINDA</span><h2>{profile.role === 'freelancer' ? 'Çalışma yaklaşımı' : 'Şirket hakkında'}</h2><p>{profile.bio || 'Bu profil henüz hakkında bilgisi eklemedi.'}</p>{profile.role === 'freelancer' && <div className="public-profile-skills">{profile.skills?.length ? profile.skills.map((skill: string) => <span key={skill}>{skill}</span>) : <span>Henüz beceri eklenmedi</span>}</div>}</section>

          {profile.role === 'freelancer' && <section className="public-portfolio-section"><div className="dashboard-section-title"><div><p>SEÇİLİ ÇALIŞMALAR</p><h2>Portföy</h2></div><span>{portfolio?.length ?? 0} çalışma</span></div><div className="public-portfolio-grid">
            {portfolio?.map((item) => <a key={item.id} href={item.file_url || '#'} target="_blank" rel="noreferrer"><div className={`public-portfolio-media ${isPortfolioImage(item.file_url) ? '' : 'document'}`}>{isPortfolioImage(item.file_url) ? <Image src={item.file_url} width={800} height={500} alt={item.title} /> : <><strong>PDF</strong><span>Dosyayı incele ↗</span></>}</div><div><h3>{item.title}</h3><p>{item.description || 'Açıklama eklenmedi.'}</p><small>{formatDate(item.created_at)}</small></div></a>)}
            {portfolio?.length === 0 && <div className="marketplace-empty public-portfolio-empty"><strong>Henüz çalışma eklenmedi.</strong><p>Portföy çalışmaları yayınlandığında burada görünecek.</p></div>}
          </div></section>}
        </main>

        <aside className="public-reviews"><span>DEĞERLENDİRMELER</span><h2>{average ? `${average} / 5` : 'Henüz puan yok'}</h2><p>{reviews?.length ?? 0} doğrulanmış iş değerlendirmesi</p><div>{reviews?.length ? reviews.map((review, index) => { const reviewer = Array.isArray(review.reviewer) ? review.reviewer[0] : review.reviewer; return <article key={index}><strong>{'★'.repeat(review.rating)}</strong><p>{review.comment || 'Yorum bırakılmadı.'}</p><small>{reviewer?.company_name || reviewer?.full_name || 'İşlik kullanıcısı'} · {formatDate(review.created_at)}</small></article> }) : <div className="public-review-empty">İlk tamamlanan işten sonra değerlendirmeler burada görünecek.</div>}</div>{profile.portfolio_url && <a href={profile.portfolio_url} target="_blank" rel="noreferrer">Önceki portföy dosyasını aç ↗</a>}</aside>
      </div>
    </>}
  </MarketplaceShell>
}
