import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketplaceShell, SetupNotice } from '@/app/marketplace-shell'
import { FavoriteButton } from '@/app/favorite-button'
import { requireRole } from '@/lib/auth/role'
import { getFavorites, MAX_FAVORITES } from '@/lib/favorites'
import { formatCurrency, formatDate } from '@/lib/marketplace'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Favorilerim — Taskavia' }

export default async function FavoritesPage() {
  const { supabase, user, fullName } = await requireRole('freelancer')
  const favorites = getFavorites(user.user_metadata)
  const { data: jobs, error } = favorites.length
    ? await supabase.from('jobs').select('id, title, description, category, status, budget_min, budget_max, deadline').in('id', favorites.map((favorite) => favorite.jobId))
    : { data: [], error: null }
  return <MarketplaceShell name={fullName} role="freelancer" active="favorites">
    <div className="marketplace-page-head"><div><p>KAYDETTİĞİN İLANLAR</p><h1>Favorilerim</h1><span>İlgini çeken projelere kaldığın yerden dön.</span></div><Link href="/jobs">İşleri keşfet →</Link></div>
    <p className="favorites-count">{favorites.length} / {MAX_FAVORITES} ilan · Son kaydedilen önce</p>
    {error ? <SetupNotice /> : <div className="jobs-feed favorites-feed">
      {favorites.map((favorite) => {
        const job = jobs?.find((item) => item.id === favorite.jobId)
        const status = job?.status === 'open' ? 'Tekliflere açık' : job?.status === 'assigned' ? 'Freelancer atandı' : job?.status === 'completed' ? 'Tamamlandı' : 'Kapalı ilan'
        return <article className="job-feed-card" key={favorite.jobId}>
          <div className="favorite-card-top"><span className={`favorite-status ${job?.status === 'open' ? 'open' : ''}`}>{job ? status : 'İlan artık erişilebilir değil'}</span><FavoriteButton jobId={favorite.jobId} saved title={job?.title ?? 'Erişilemeyen ilan'} /></div>
          {job ? <><small>{job.category}</small><h2><Link href={`/jobs/${job.id}`}>{job.title}</Link></h2><p>{job.description}</p><footer><div><small>BÜTÇE</small><strong>{formatCurrency(job.budget_min)} – {formatCurrency(job.budget_max)}</strong></div><div><small>SON TARİH</small><strong>{formatDate(job.deadline)}</strong></div><Link href={`/jobs/${job.id}`}>İlanı incele →</Link></footer></> : <p>İlan kaldırılmış veya erişimi değişmiş olabilir. Favorilerinden kaldırabilirsin.</p>}
          <small className="favorite-saved-at">Kaydedildi: {formatDate(favorite.savedAt)}</small>
        </article>
      })}
      {!favorites.length && <div className="marketplace-empty favorites-empty"><span aria-hidden="true">☆</span><strong>Henüz favori ilanın yok</strong><p>İlanlardaki “Kaydet” düğmesine dokun; daha sonra burada bulabilirsin.</p><Link href="/jobs">İlanları keşfet →</Link></div>}
    </div>}
  </MarketplaceShell>
}
