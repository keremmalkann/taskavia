import type { Metadata } from 'next'
import Link from 'next/link'
import { DashboardDate, StatCard } from '@/app/dashboard-shell'
import { MarketplaceShell, SetupNotice } from '@/app/marketplace-shell'
import { requireRole } from '@/lib/auth/role'
import { categories, formatCurrency, formatDate } from '@/lib/marketplace'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Freelancer Paneli — İşlik', description: 'Tekliflerini, projelerini ve kazançlarını yönet.' }

export default async function FreelancerPage() {
  const { supabase, user, fullName } = await requireRole('freelancer')
  const [{ data: jobs, error: jobsError }, { data: proposals }, { data: payments }] = await Promise.all([
    supabase.from('jobs').select('*, employer:profiles!jobs_employer_id_fkey(full_name, company_name)').eq('status', 'open').order('created_at', { ascending: false }).limit(3),
    supabase.from('proposals').select('id, status, job_id, price').eq('freelancer_id', user.id),
    supabase.from('payments').select('amount, platform_fee, status').eq('freelancer_id', user.id),
  ])
  const active = proposals?.filter((proposal) => proposal.status === 'accepted').length ?? 0
  const pending = proposals?.filter((proposal) => proposal.status === 'pending').length ?? 0
  const earnings = payments?.filter((payment) => payment.status === 'released').reduce((sum, payment) => sum + Number(payment.amount) - Number(payment.platform_fee), 0) ?? 0

  return <MarketplaceShell name={fullName} role="freelancer" active="dashboard">
    <div className="dashboard-heading"><div><p>FREELANCER PANELİ</p><h1>Günaydın, {fullName.split(' ')[0]}.</h1><span>Yeni fırsatları keşfet, tekliflerini ve aktif işlerini tek yerden yönet.</span></div><DashboardDate /></div>
    <section className="dashboard-stats"><StatCard label="AKTİF TEKLİFLER" value={String(pending)} note={`${proposals?.length ?? 0} toplam teklif`} href="/freelancer/activity?view=proposals" /><StatCard label="DEVAM EDEN İŞLER" value={String(active)} note="Kabul edilmiş projeler" tone="lime" href="/freelancer/activity?view=jobs" /><StatCard label="TOPLAM KAZANÇ" value={formatCurrency(earnings)} note="Serbest bırakılan ödemeler" tone="dark" href="/freelancer/activity?view=earnings" /></section>
    <section className="dashboard-section"><div className="dashboard-section-title"><div><p>YENİ FIRSATLAR</p><h2>Sana açık projeler</h2></div><Link href="/jobs">Tümünü gör →</Link></div><nav className="dashboard-category-links" aria-label="Kategoriye göre işleri keşfet">{categories.map((category) => <Link href={`/jobs?category=${encodeURIComponent(category)}`} key={category}>{category}</Link>)}</nav>{jobsError && <SetupNotice />}<div className="opportunity-list">{jobs?.map((job) => { const employer = Array.isArray(job.employer) ? job.employer[0] : job.employer; return <article className="opportunity-card" key={job.id}><div className="opportunity-company"><span>{(employer?.company_name || employer?.full_name || 'İŞ').slice(0,2).toLocaleUpperCase('tr-TR')}</span><div><strong>{employer?.company_name || employer?.full_name || 'İşlik işvereni'}</strong><small>{formatDate(job.created_at)}</small></div></div><div className="opportunity-category">{job.category}</div><h3>{job.title}</h3><div className="opportunity-skills">{job.skills?.map((skill: string) => <span key={skill}>{skill}</span>)}</div><footer><div><small>BÜTÇE</small><strong>{formatCurrency(job.budget_min)} – {formatCurrency(job.budget_max)}</strong></div><Link className="round-link" href={`/jobs/${job.id}`}>→</Link></footer></article>})}{!jobsError && jobs?.length === 0 && <div className="marketplace-empty"><p>Henüz açık ilan yok.</p></div>}</div></section>
  </MarketplaceShell>
}
