import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketplaceShell, SetupNotice } from '@/app/marketplace-shell'
import { requireRole } from '@/lib/auth/role'
import { categories, formatCurrency, formatDate } from '@/lib/marketplace'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'İşleri Keşfet — İşlik', description: 'Açık freelancer ilanlarını ara ve filtrele.' }

export default async function JobsPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string; minBudget?: string; skill?: string }> }) {
  const filters = await searchParams
  const { supabase, fullName } = await requireRole('freelancer')
  let query = supabase.from('jobs').select('*, employer:profiles!jobs_employer_id_fkey(full_name, company_name)').eq('status', 'open').order('created_at', { ascending: false })
  if (filters.q) query = query.ilike('title', `%${filters.q.slice(0, 80)}%`)
  if (filters.category) query = query.eq('category', filters.category)
  if (Number(filters.minBudget) > 0) query = query.gte('budget_max', Number(filters.minBudget))
  if (filters.skill) query = query.contains('skills', [filters.skill.slice(0, 40)])
  const { data: jobs, error } = await query.limit(50)

  return (
    <MarketplaceShell name={fullName} role="freelancer" active="jobs">
      <div className="marketplace-page-head"><div><p>AÇIK İLANLAR</p><h1>Doğru işi bul.</h1><span>Yeteneklerine, bütçene ve çalışma takvimine uyan projeleri keşfet.</span></div><strong>{jobs?.length ?? 0} sonuç</strong></div>
      <form className="job-filters">
        <label className="job-search"><span>⌕</span><input name="q" defaultValue={filters.q} placeholder="İlanlarda ara…" /></label>
        <select name="category" defaultValue={filters.category ?? ''}><option value="">Tüm kategoriler</option>{categories.map((category) => <option key={category}>{category}</option>)}</select>
        <input name="skill" defaultValue={filters.skill} placeholder="Beceri" />
        <input name="minBudget" type="number" min="0" defaultValue={filters.minBudget} placeholder="Min. bütçe" />
        <button type="submit">Filtrele</button>
      </form>
      {error && <SetupNotice />}
      <div className="jobs-feed">
        {jobs?.map((job) => {
          const employer = Array.isArray(job.employer) ? job.employer[0] : job.employer
          return <article className="job-feed-card" key={job.id}>
            <div className="job-feed-top"><span>{job.category}</span><small>{formatDate(job.created_at)}</small></div>
            <h2><Link href={`/jobs/${job.id}`}>{job.title}</Link></h2><p>{job.description}</p>
            <div className="job-skill-row">{job.skills?.map((skill: string) => <span key={skill}>{skill}</span>)}</div>
            <footer><div><small>İŞVEREN</small><strong>{employer?.company_name || employer?.full_name || 'İşlik işvereni'}</strong></div><div><small>BÜTÇE</small><strong>{formatCurrency(job.budget_min)} – {formatCurrency(job.budget_max)}</strong></div><div><small>SON TARİH</small><strong>{formatDate(job.deadline)}</strong></div><Link href={`/jobs/${job.id}`}>İncele →</Link></footer>
          </article>
        })}
        {!error && jobs?.length === 0 && <div className="marketplace-empty"><strong>Uygun ilan bulunamadı</strong><p>Filtreleri değiştirerek yeniden deneyebilirsin.</p></div>}
      </div>
    </MarketplaceShell>
  )
}
