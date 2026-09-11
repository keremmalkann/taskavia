import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MarketplaceShell, Feedback, SetupNotice } from '@/app/marketplace-shell'
import { archiveJob, closeJob, completeJob, deleteJob, publishJob, reopenJob, restoreArchivedJob } from '@/lib/actions/marketplace'
import { requireUser } from '@/lib/auth/role'
import { formatCurrency, formatDate } from '@/lib/marketplace'
import { ProposalForm } from './proposal-form'
import { ProposalManager } from './proposal-manager'
import { FavoriteButton } from '@/app/favorite-button'
import { PendingSubmitButton } from '@/app/pending-submit-button'
import { getFavorites } from '@/lib/favorites'
import { SafetyActions } from '@/app/safety-actions'
import './job-owner-controls.css'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'İlan Detayı — Taskavia', description: 'İlan detaylarını ve teklifleri görüntüle.' }

export default async function JobDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; message?: string }> }) {
  const [{ id }, feedback] = await Promise.all([params, searchParams])
  const { supabase, user, role, fullName } = await requireUser()
  const { data: job, error: jobError } = await supabase.from('jobs').select('*, employer:profiles!jobs_employer_id_fkey(id, full_name, company_name, title)').eq('id', id).maybeSingle()
  if (!job && !jobError) notFound()
  const isOwner = role === 'employer' && job?.employer_id === user.id
  const { data: proposals } = await supabase.from('proposals').select('*, freelancer:profiles!proposals_freelancer_id_fkey(id, full_name, title, skills, hourly_rate, experience_years)').eq('job_id', id).order('created_at', { ascending: false })
  const ownProposal = proposals?.find((proposal) => proposal.freelancer_id === user.id)
  const accepted = proposals?.find((proposal) => proposal.status === 'accepted')
  const employer = Array.isArray(job?.employer) ? job.employer[0] : job?.employer

  return <MarketplaceShell name={fullName} role={role} active={role === 'freelancer' ? 'jobs' : 'dashboard'}>
    <Feedback {...feedback} />
    {jobError && <SetupNotice />}
    {job && <div className="job-detail-page">
      {role === 'freelancer' && <div className="job-favorite-toolbar"><Link href="/freelancer/favorites">Favorilerim →</Link><div className="job-toolbar-actions"><FavoriteButton jobId={id} saved={getFavorites(user.user_metadata).some((favorite) => favorite.jobId === id)} title={job.title} />{job.employer_id !== user.id && <SafetyActions compact returnPath={`/jobs/${id}`} subjectType="job" subjectId={id} />}</div></div>}
      <div className="job-detail-head"><div><span>{job.category} · {job.status === 'open' ? 'Açık ilan' : job.status === 'assigned' ? 'Freelancer atandı' : job.status === 'completed' ? 'Tamamlandı' : job.status === 'draft' ? 'Taslak (yayında değil)' : job.status === 'closed' ? 'Tekliflere kapalı' : job.status === 'archived' ? 'Arşivlendi' : 'İptal edildi'}</span><h1>{job.title}</h1><p>{employer?.company_name || employer?.full_name} · {formatDate(job.created_at)}</p></div><div><small>BÜTÇE</small><strong>{formatCurrency(job.budget_min)} – {formatCurrency(job.budget_max)}</strong><span>Son tarih: {formatDate(job.deadline)}</span></div></div>
      <div className="job-detail-layout">
        <article className="job-description"><h2>Proje hakkında</h2><p>{job.description}</p><h3>Aranan beceriler</h3><div className="job-skill-row">{job.skills?.map((skill: string) => <span key={skill}>{skill}</span>)}</div></article>
        <aside className="job-action-panel">
          {role === 'freelancer' && job.status === 'open' && !ownProposal && <ProposalForm jobId={id} minimumBudget={Number(job.budget_min)} />}
          {role === 'freelancer' && ownProposal && <div className="proposal-own"><span>TEKLİFİN</span><strong>{formatCurrency(ownProposal.price)}</strong><p>{ownProposal.duration_days} gün · {ownProposal.status === 'pending' ? 'İnceleniyor' : ownProposal.status === 'accepted' ? 'Kabul edildi' : ownProposal.status === 'withdrawn' ? 'Geri çekildi' : 'Sonuçlandı'}</p>{ownProposal.status === 'accepted' && <Link href={`/messages/${ownProposal.id}`}>Mesajlaşmaya git →</Link>}</div>}
          {role === 'freelancer' && ownProposal?.status === 'pending' && job.status === 'open' && <ProposalManager proposal={ownProposal} minimumBudget={Number(job.budget_min)} />}
{isOwner && <div className="owner-job-actions"><strong>{proposals?.length ?? 0} teklif</strong><p>{job.status === 'open' ? 'Teklif almaya açık' : job.status === 'assigned' ? 'Çalışma devam ediyor' : job.status === 'completed' ? 'Çalışma tamamlandı' : job.status === 'draft' ? 'Taslak henüz yayında değil' : job.status === 'closed' ? 'İlan tekliflere kapalı' : job.status === 'archived' ? 'İlan arşivde; kayıtları korunuyor' : 'İlan kapalı'}</p>{job.status === 'draft' && <form action={publishJob.bind(null, id, job.updated_at)}><PendingSubmitButton className="job-manage-button" pendingLabel="Yayınlanıyor...">Taslağı yayınla →</PendingSubmitButton></form>}{['draft', 'open', 'closed'].includes(job.status) && <Link className="job-edit-button" href={`/employer/jobs/${id}/edit`}>Projeyi düzenle <span aria-hidden="true">→</span></Link>}{job.status === 'open' && <form action={closeJob.bind(null, id, job.updated_at)}><PendingSubmitButton className="job-manage-button" pendingLabel="Kapatılıyor...">Teklifleri kapat</PendingSubmitButton></form>}{job.status === 'closed' && <form action={reopenJob.bind(null, id, job.updated_at)}><PendingSubmitButton className="job-manage-button" pendingLabel="Yayınlanıyor...">Yeniden yayınla</PendingSubmitButton></form>}{job.status === 'archived' && <form action={restoreArchivedJob.bind(null, id, job.updated_at)}><PendingSubmitButton className="job-manage-button" pendingLabel="Geri alınıyor...">Arşivden çıkar →</PendingSubmitButton></form>}{job.status === 'assigned' && <form action={completeJob.bind(null, id)}><PendingSubmitButton pendingLabel="Tamamlanıyor...">İşi tamamlandı olarak işaretle</PendingSubmitButton></form>}{accepted && <Link href={`/messages/${accepted.id}`}>Çalışma alanını aç →</Link>}{job.status === 'draft' && <details className="job-delete-confirm"><summary>Taslağı sil</summary><form action={deleteJob.bind(null, id)}><p>Hiç yayınlanmamış bu taslak kalıcı olarak silinecek. Bu işlem geri alınamaz.</p><PendingSubmitButton className="job-danger-button" pendingLabel="Siliniyor...">Taslağı kalıcı sil</PendingSubmitButton></form></details>}{['open', 'closed'].includes(job.status) && <details className="job-delete-confirm"><summary>İlanı arşivle</summary><form action={archiveJob.bind(null, id, job.updated_at)}><p>İlan listelerden kaldırılır; teklif ve mesaj geçmişi korunur. Daha sonra arşivden çıkarabilirsin.</p><PendingSubmitButton className="job-danger-button" pendingLabel="Arşivleniyor...">İlanı arşivle</PendingSubmitButton></form></details>}</div>}
        </aside>
      </div>
      {isOwner && <section className="proposal-section"><div className="dashboard-section-title"><div><p>GELEN TEKLİFLER</p><h2>{proposals?.length === 1 ? 'Teklifi incele' : 'Adayları karşılaştır'}</h2></div>{(proposals?.length ?? 0) > 0 && <Link href={`/employer/jobs/${id}/proposals`}>{proposals?.length === 1 ? 'Teklifi incele ve onayla →' : 'Karşılaştırma ekranını aç →'}</Link>}</div><div className="proposal-grid">{proposals?.map((proposal) => { const freelancer = Array.isArray(proposal.freelancer) ? proposal.freelancer[0] : proposal.freelancer; return <article key={proposal.id}><div className="proposal-person"><span>{freelancer?.full_name?.slice(0,2).toLocaleUpperCase('tr-TR')}</span><div><strong>{freelancer?.full_name}</strong><small>{freelancer?.title || 'Freelancer'}</small></div><em>{proposal.status === 'pending' ? 'İnceleniyor' : proposal.status === 'accepted' ? 'Kabul edildi' : proposal.status === 'withdrawn' ? 'Geri çekildi' : 'Reddedildi'}</em></div><p>{proposal.message}</p><div className="proposal-numbers"><div><small>TEKLİF</small><strong>{formatCurrency(proposal.price)}</strong></div><div><small>SÜRE</small><strong>{proposal.duration_days} gün</strong></div></div>{proposal.status === 'pending' && job.status === 'open' && <Link href={`/employer/jobs/${id}/proposals`}>{proposals?.length === 1 ? 'İncele ve onayla →' : 'Karşılaştır ve karar ver →'}</Link>}{proposal.status === 'accepted' && <Link href={`/messages/${proposal.id}`}>Mesaj gönder →</Link>}</article> })}{proposals?.length === 0 && <div className="marketplace-empty"><p>Henüz teklif gelmedi.</p></div>}</div></section>}
    </div>}
  </MarketplaceShell>
}
