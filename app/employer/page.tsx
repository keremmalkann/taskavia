import type { Metadata } from 'next'
import Link from 'next/link'
import { DashboardDate, StatCard } from '@/app/dashboard-shell'
import { PendingSubmitButton } from '@/app/pending-submit-button'
import { closeJob, publishJob, reopenJob, restoreArchivedJob } from '@/lib/actions/marketplace'
import { MarketplaceShell, SetupNotice } from '@/app/marketplace-shell'
import { requireRole } from '@/lib/auth/role'
import { formatCurrency } from '@/lib/marketplace'
import { paymentsEnabled } from '@/lib/features'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'İşveren Paneli — Taskavia', description: 'Projelerini ve adaylarını tek yerden yönet.' }

const jobStatusLabels: Record<string, string> = {
  open: 'Tekliflere açık',
  assigned: 'Devam ediyor',
  completed: 'Tamamlandı',
  cancelled: 'İptal edildi',
  draft: 'Taslak',
  closed: 'Tekliflere kapalı',
  archived: 'Arşivlendi',
}

export default async function EmployerPage() {
  const { supabase, user, fullName } = await requireRole('employer')
  const paymentQuery = paymentsEnabled
    ? supabase.from('payments').select('amount, status').eq('employer_id', user.id)
    : Promise.resolve({ data: [], error: null })
  const [{ data: jobs, error: jobsError }, { data: archivedJobData }, { data: payments }, { data: reviews }] = await Promise.all([
    supabase.from('jobs').select('*, proposals(id, status, freelancer_id)').eq('employer_id', user.id).neq('status', 'archived').order('created_at', { ascending: false }).limit(8),
    supabase.from('jobs').select('*, proposals(id, status, freelancer_id)').eq('employer_id', user.id).eq('status', 'archived').order('updated_at', { ascending: false }).limit(20),
    paymentQuery,
    supabase.from('reviews').select('job_id').eq('reviewer_id', user.id),
  ])
  const visibleJobs = jobs ?? []
  const archivedJobs = archivedJobData ?? []
  const activeJobs = visibleJobs.filter((job) => job.status === 'open' || job.status === 'assigned').length
  const proposalCount = visibleJobs.reduce((sum, job) => sum + (job.proposals?.filter((proposal: { status: string }) => proposal.status === 'pending').length ?? 0), 0)
  const completedJobs = visibleJobs.filter((job) => job.status === 'completed').length
  const spending = payments?.filter((payment) => payment.status === 'funded' || payment.status === 'released').reduce((sum, payment) => sum + Number(payment.amount), 0) ?? 0
  const reviewedJobIds = new Set(reviews?.map((review) => review.job_id) ?? [])

  return <MarketplaceShell name={fullName} role="employer" active="dashboard">
    <div className="dashboard-heading"><div><p>İŞVEREN PANELİ</p><h1>Merhaba, {fullName.split(' ')[0]}.</h1><span>Projelerini yayınla, teklifleri karşılaştır ve çalışmaları güvenle yönet.</span></div><DashboardDate /></div>
    <section className="dashboard-stats"><StatCard label="AKTİF PROJELER" value={String(activeJobs)} note={`${visibleJobs.length} görünür proje`} /><StatCard label="BEKLEYEN TEKLİFLER" value={String(proposalCount)} note="İncelemeni bekleyen adaylar" tone="blue" />{paymentsEnabled ? <StatCard label="TOPLAM HARCAMA" value={formatCurrency(spending)} note="Fonlanan ve tamamlanan işler" tone="dark" /> : <StatCard label="TAMAMLANAN İŞLER" value={String(completedJobs)} note="Başarıyla kapatılan projeler" tone="dark" />}</section>
    <section className="dashboard-section employer-projects"><div className="dashboard-section-title"><div><p>PROJELERİN</p><h2>İşe alım gündemi</h2></div></div>{jobsError && <SetupNotice />}<div className="project-table employer-project-table"><div className="project-table-head"><span>PROJE</span><span>TEKLİFLER</span><span>DURUM</span><span>BÜTÇE</span><span>İŞLEM</span></div>{visibleJobs.map((job, index) => {
      const acceptedProposal = job.proposals?.find((proposal: { status: string; freelancer_id: string }) => proposal.status === 'accepted')
      const hasReview = reviewedJobIds.has(job.id)
      return <article key={job.id}><div className="project-name"><span className={`project-color ${index % 3 === 1 ? 'blue' : index % 3 === 2 ? 'lime' : ''}`} /><strong>{job.title}</strong></div><div className="project-cell"><small>TEKLİFLER</small><Link className="project-proposal-link" href={`/employer/jobs/${job.id}/proposals`}>{job.proposals?.length ?? 0} aday</Link></div><div className="project-cell"><small>DURUM</small><span className="project-status">{jobStatusLabels[job.status] ?? job.status}</span></div><div className="project-cell project-budget"><small>BÜTÇE</small><strong>{formatCurrency(job.budget_max)}</strong></div><div className="project-actions">{job.status === 'draft' && <form action={publishJob.bind(null, job.id, job.updated_at)}><PendingSubmitButton className="project-quick-button" pendingLabel="Yayınlanıyor...">Yayınla</PendingSubmitButton></form>}{job.status === 'open' && <form action={closeJob.bind(null, job.id, job.updated_at)}><PendingSubmitButton className="project-quick-button" pendingLabel="Kapatılıyor...">Teklifleri kapat</PendingSubmitButton></form>}{job.status === 'closed' && <form action={reopenJob.bind(null, job.id, job.updated_at)}><PendingSubmitButton className="project-quick-button" pendingLabel="Yayınlanıyor...">Yeniden yayınla</PendingSubmitButton></form>}{job.status === 'completed' && acceptedProposal && (hasReview ? <span className="project-reviewed">✓ Değerlendirildi</span> : <Link className="project-review-link" href={`/reviews/new?job=${job.id}&to=${acceptedProposal.freelancer_id}`}>Freelancer’ı değerlendir</Link>)}<Link className="round-link" href={`/jobs/${job.id}`} aria-label={`${job.title} ilanını aç`}>→</Link></div></article>
    })}{!jobsError && visibleJobs.length === 0 && <div className="marketplace-empty"><p>Görünür projen yok. İlk ilanını yayınlayabilir veya arşivden bir ilanı geri alabilirsin.</p></div>}</div>{archivedJobs.length > 0 && <details className="archived-projects"><summary>Arşivlenmiş ilanlar <span>{archivedJobs.length}</span></summary><div>{archivedJobs.map((job) => <article key={job.id}><div><strong>{job.title}</strong><small>{job.proposals?.length ?? 0} teklifin geçmişi korunuyor</small></div><div><Link href={`/jobs/${job.id}`}>Görüntüle</Link><form action={restoreArchivedJob.bind(null, job.id, job.updated_at)}><PendingSubmitButton pendingLabel="Geri alınıyor...">Arşivden çıkar</PendingSubmitButton></form></div></article>)}</div></details>}</section>
    <section className="employer-bottom-grid"><article className="candidate-panel"><p>HIZLI BAŞLANGIÇ</p><div className="candidate-avatar">＋</div><h3>Yeni proje oluştur</h3><span>İhtiyacını anlat, teklifler aynı panelde toplansın.</span><div className="candidate-tags"><span>RLS güvenli</span><span>Teklif sistemi</span></div><Link href="/employer/jobs/new">İlan yayınla →</Link></article><article className="employer-tip"><span>✦ TASKAVIA ÖNERİSİ</span><h3>Net teslimatlar ve örnek referanslar daha iyi teklif getirir.</h3><p>Proje kapsamını, bütçe aralığını ve son tarihi açıkça yazarak doğru yeteneklerle daha hızlı eşleş.</p><Link href="/employer/jobs/new">Yeni proje oluştur →</Link></article></section>
  </MarketplaceShell>
}
