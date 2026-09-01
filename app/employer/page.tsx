import type { Metadata } from 'next'
import Link from 'next/link'
import { DashboardDate, StatCard } from '@/app/dashboard-shell'
import { MarketplaceShell, SetupNotice } from '@/app/marketplace-shell'
import { requireRole } from '@/lib/auth/role'
import { formatCurrency } from '@/lib/marketplace'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'İşveren Paneli — İşlik', description: 'Projelerini, adaylarını ve ödemelerini yönet.' }

export default async function EmployerPage() {
  const { supabase, user, fullName } = await requireRole('employer')
  const [{ data: jobs, error: jobsError }, { data: payments }, { data: reviews }] = await Promise.all([
    supabase.from('jobs').select('*, proposals(id, status, freelancer_id)').eq('employer_id', user.id).order('created_at', { ascending: false }).limit(8),
    supabase.from('payments').select('amount, status').eq('employer_id', user.id),
    supabase.from('reviews').select('job_id').eq('reviewer_id', user.id),
  ])
  const activeJobs = jobs?.filter((job) => job.status === 'open' || job.status === 'assigned').length ?? 0
  const proposalCount = jobs?.reduce((sum, job) => sum + (job.proposals?.filter((proposal: { status: string }) => proposal.status === 'pending').length ?? 0), 0) ?? 0
  const spending = payments?.filter((payment) => payment.status === 'funded' || payment.status === 'released').reduce((sum, payment) => sum + Number(payment.amount), 0) ?? 0
  const reviewedJobIds = new Set(reviews?.map((review) => review.job_id) ?? [])

  return <MarketplaceShell name={fullName} role="employer" active="dashboard">
    <div className="dashboard-heading"><div><p>İŞVEREN PANELİ</p><h1>Merhaba, {fullName.split(' ')[0]}.</h1><span>Projelerini yayınla, teklifleri karşılaştır ve çalışmaları güvenle yönet.</span></div><DashboardDate /></div>
    <section className="dashboard-stats"><StatCard label="AKTİF PROJELER" value={String(activeJobs)} note={`${jobs?.length ?? 0} toplam proje`} /><StatCard label="BEKLEYEN TEKLİFLER" value={String(proposalCount)} note="İncelemeni bekleyen adaylar" tone="blue" /><StatCard label="TOPLAM HARCAMA" value={formatCurrency(spending)} note="Fonlanan ve tamamlanan işler" tone="dark" /></section>
    <section className="dashboard-section employer-projects"><div className="dashboard-section-title"><div><p>PROJELERİN</p><h2>İşe alım gündemi</h2></div><Link href="/employer/jobs/new">Yeni ilan →</Link></div>{jobsError && <SetupNotice />}<div className="project-table employer-project-table"><div className="project-table-head"><span>PROJE</span><span>TEKLİFLER</span><span>DURUM</span><span>BÜTÇE</span><span>İŞLEM</span></div>{jobs?.map((job, index) => {
      const acceptedProposal = job.proposals?.find((proposal: { status: string; freelancer_id: string }) => proposal.status === 'accepted')
      const hasReview = reviewedJobIds.has(job.id)
      return <article key={job.id}><div className="project-name"><span className={`project-color ${index % 3 === 1 ? 'blue' : index % 3 === 2 ? 'lime' : ''}`} /><strong>{job.title}</strong></div><Link className="project-proposal-link" href={`/employer/jobs/${job.id}/proposals`}>{job.proposals?.length ?? 0} aday</Link><span className="project-status">{job.status}</span><strong>{formatCurrency(job.budget_max)}</strong><div className="project-actions">{job.status === 'completed' && acceptedProposal && (hasReview ? <span className="project-reviewed">✓ Değerlendirildi</span> : <Link className="project-review-link" href={`/reviews/new?job=${job.id}&to=${acceptedProposal.freelancer_id}`}>Freelancer’ı değerlendir</Link>)}<Link className="round-link" href={`/jobs/${job.id}`} aria-label={`${job.title} ilanını aç`}>→</Link></div></article>
    })}{!jobsError && jobs?.length === 0 && <div className="marketplace-empty"><p>Henüz projen yok. İlk ilanını yayınlayarak başla.</p></div>}</div></section>
    <section className="employer-bottom-grid"><article className="candidate-panel"><p>HIZLI BAŞLANGIÇ</p><div className="candidate-avatar">＋</div><h3>Yeni proje oluştur</h3><span>İhtiyacını anlat, teklifler aynı panelde toplansın.</span><div className="candidate-tags"><span>RLS güvenli</span><span>Teklif sistemi</span></div><Link href="/employer/jobs/new">İlan yayınla →</Link></article><article className="employer-tip"><span>✦ İŞLİK ÖNERİSİ</span><h3>Net teslimatlar ve örnek referanslar daha iyi teklif getirir.</h3><p>Proje kapsamını, bütçe aralığını ve son tarihi açıkça yazarak doğru yeteneklerle daha hızlı eşleş.</p><Link href="/employer/jobs/new">Yeni proje oluştur →</Link></article></section>
  </MarketplaceShell>
}
