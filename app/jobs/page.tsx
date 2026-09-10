import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketplaceShell, SetupNotice } from '@/app/marketplace-shell'
import { requireRole } from '@/lib/auth/role'
import { categories, formatCurrency, formatDate } from '@/lib/marketplace'
import { FavoriteButton } from '@/app/favorite-button'
import { getFavorites } from '@/lib/favorites'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'İşleri Keşfet — Taskavia', description: 'Açık freelancer ilanlarını ara ve filtrele.' }

function normalizeSearch(value: string | undefined) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, 80)
}

function matchesFallbackSearch(job: { title: string; description: string; category: string; skills?: string[] | null }, value: string) {
  const needle = value.toLocaleLowerCase('tr-TR')
  return [job.title, job.description, job.category, ...(job.skills ?? [])]
    .join(' ')
    .toLocaleLowerCase('tr-TR')
    .includes(needle)
}

export default async function JobsPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string; minBudget?: string }> }) {
  const filters = await searchParams
  const { supabase, fullName, user } = await requireRole('freelancer')
  const favoriteIds = new Set(getFavorites(user.user_metadata).map((favorite) => favorite.jobId))
  const selectedCategory = categories.includes(filters.category as (typeof categories)[number]) ? filters.category : ''
  const search = normalizeSearch(filters.q)
  let query = supabase.from('jobs').select('*, employer:profiles!jobs_employer_id_fkey(full_name, company_name)').eq('status', 'open').order('created_at', { ascending: false })
  if (search) query = query.textSearch('search_vector', search, { config: 'simple', type: 'websearch' })
  if (selectedCategory) query = query.eq('category', selectedCategory)
  if (Number(filters.minBudget) > 0) query = query.gte('budget_max', Number(filters.minBudget))
  let { data: jobs, error } = await query.limit(50)

  // A deployment remains usable while the search migration is being rolled out.
  if (search && error) {
    let fallbackQuery = supabase.from('jobs').select('*, employer:profiles!jobs_employer_id_fkey(full_name, company_name)').eq('status', 'open').order('created_at', { ascending: false })
    if (selectedCategory) fallbackQuery = fallbackQuery.eq('category', selectedCategory)
    if (Number(filters.minBudget) > 0) fallbackQuery = fallbackQuery.gte('budget_max', Number(filters.minBudget))
    const fallback = await fallbackQuery.limit(100)
    jobs = fallback.data?.filter((job) => matchesFallbackSearch(job, search)) ?? null
    error = fallback.error
  }

  return (
    <MarketplaceShell name={fullName} role="freelancer" active="jobs">
      <div className="marketplace-page-head"><div><p>AÇIK İLANLAR</p><h1>{selectedCategory ? `${selectedCategory} işleri` : 'Doğru işi bul.'}</h1><span>{selectedCategory ? `${selectedCategory} kategorisindeki açık projeleri karşılaştır.` : 'Yeteneklerine, bütçene ve çalışma takvimine uyan projeleri keşfet.'}</span></div><strong>{jobs?.length ?? 0} sonuç</strong></div>
      <nav className="job-category-picker" aria-label="İş kategorileri">
        {[{ label: 'Tüm işler', value: '', icon: '✦' }, { label: 'Yazılım', value: 'Yazılım', icon: '</>' }, { label: 'Tasarım', value: 'Tasarım', icon: '◇' }, { label: 'Pazarlama', value: 'Pazarlama', icon: '↗' }, { label: 'İçerik', value: 'İçerik', icon: 'Aa' }, { label: 'Video & Ses', value: 'Video & Ses', icon: '▶' }, { label: 'Danışmanlık', value: 'Danışmanlık', icon: '◎' }].map((item) => {
          const params = new URLSearchParams()
          if (item.value) params.set('category', item.value)
          if (filters.q) params.set('q', filters.q)
          if (filters.minBudget) params.set('minBudget', filters.minBudget)
          const href = params.size > 0 ? `/jobs?${params.toString()}` : '/jobs'
          return <Link className={(selectedCategory || '') === item.value ? 'active' : ''} href={href} key={item.label}><span aria-hidden="true">{item.icon}</span><strong>{item.label}</strong></Link>
        })}
      </nav>
      <form className="job-filters job-filters-simple">
        {selectedCategory && <input type="hidden" name="category" value={selectedCategory} />}
        <label className="job-search"><span>⌕</span><input name="q" defaultValue={search} placeholder="Başlık, açıklama veya beceri ara…" /></label>
        <input name="minBudget" type="number" min="0" defaultValue={filters.minBudget} placeholder="Min. bütçe" />
        <button type="submit">Filtrele</button>
      </form>
      {error && <SetupNotice />}
      <div className="jobs-feed">
        {jobs?.map((job) => {
          const employer = Array.isArray(job.employer) ? job.employer[0] : job.employer
          return <article className="job-feed-card" key={job.id}>
            <div className="job-feed-top"><span>{job.category}</span><small>{formatDate(job.created_at)}</small><FavoriteButton jobId={job.id} saved={favoriteIds.has(job.id)} title={job.title} /></div>
            <h2><Link href={`/jobs/${job.id}`}>{job.title}</Link></h2><p>{job.description}</p>
            <div className="job-skill-row">{job.skills?.map((skill: string) => <span key={skill}>{skill}</span>)}</div>
            <footer><div><small>İŞVEREN</small><strong>{employer?.company_name || employer?.full_name || 'Taskavia işvereni'}</strong></div><div><small>BÜTÇE</small><strong>{formatCurrency(job.budget_min)} – {formatCurrency(job.budget_max)}</strong></div><div><small>SON TARİH</small><strong>{formatDate(job.deadline)}</strong></div><Link href={`/jobs/${job.id}`}>İncele →</Link></footer>
          </article>
        })}
        {!error && jobs?.length === 0 && <div className="marketplace-empty"><strong>Uygun ilan bulunamadı</strong><p>Filtreleri değiştirerek yeniden deneyebilirsin.</p></div>}
      </div>
    </MarketplaceShell>
  )
}
