import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MarketplaceShell, Feedback, SetupNotice } from '@/app/marketplace-shell'
import { completeJob } from '@/lib/actions/marketplace'
import { requireUser } from '@/lib/auth/role'
import { formatCurrency, formatDate } from '@/lib/marketplace'
import { ProposalForm } from './proposal-form'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'İlan Detayı — İşlik', description: 'İlan detaylarını ve teklifleri görüntüle.' }

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
    {job && <>
      <div className="job-detail-head"><div><span>{job.category} · {job.status === 'open' ? 'Açık ilan' : job.status === 'assigned' ? 'Freelancer atandı' : job.status === 'completed' ? 'Tamamlandı' : 'Kapalı'}</span><h1>{job.title}</h1><p>{employer?.company_name || employer?.full_name} · {formatDate(job.created_at)}</p></div><div><small>BÜTÇE</small><strong>{formatCurrency(job.budget_min)} – {formatCurrency(job.budget_max)}</strong><span>Son tarih: {formatDate(job.deadline)}</span></div></div>
      <div className="job-detail-layout">
        <article className="job-description"><h2>Proje hakkında</h2><p>{job.description}</p><h3>Aranan beceriler</h3><div className="job-skill-row">{job.skills?.map((skill: string) => <span key={skill}>{skill}</span>)}</div></article>
        <aside className="job-action-panel">
          {role === 'freelancer' && job.status === 'open' && !ownProposal && <ProposalForm jobId={id} minimumBudget={Number(job.budget_min)} />}
          {role === 'freelancer' && ownProposal && <div className="proposal-own"><span>TEKLİFİN</span><strong>{formatCurrency(ownProposal.price)}</strong><p>{ownProposal.duration_days} gün · {ownProposal.status === 'pending' ? 'İnceleniyor' : ownProposal.status === 'accepted' ? 'Kabul edildi' : 'Sonuçlandı'}</p>{ownProposal.status === 'accepted' && <Link href={`/messages/${ownProposal.id}`}>Mesajlaşmaya git →</Link>}</div>}
          {isOwner && <div className="owner-job-actions"><strong>{proposals?.length ?? 0} teklif</strong><p>İlan durumu: {job.status}</p>{job.status === 'assigned' && <form action={completeJob.bind(null, id)}><button type="submit">İşi tamamlandı olarak işaretle</button></form>}{accepted && <Link href={`/messages/${accepted.id}`}>Çalışma alanını aç →</Link>}</div>}
        </aside>
      </div>
      {isOwner && <section className="proposal-section"><div className="dashboard-section-title"><div><p>GELEN TEKLİFLER</p><h2>Adayları karşılaştır</h2></div><Link href={`/employer/jobs/${id}/proposals`}>Karşılaştırma ekranını aç →</Link></div><div className="proposal-grid">{proposals?.map((proposal) => { const freelancer = Array.isArray(proposal.freelancer) ? proposal.freelancer[0] : proposal.freelancer; return <article key={proposal.id}><div className="proposal-person"><span>{freelancer?.full_name?.slice(0,2).toLocaleUpperCase('tr-TR')}</span><div><strong>{freelancer?.full_name}</strong><small>{freelancer?.title || 'Freelancer'}</small></div><em>{proposal.status}</em></div><p>{proposal.message}</p><div className="proposal-numbers"><div><small>TEKLİF</small><strong>{formatCurrency(proposal.price)}</strong></div><div><small>SÜRE</small><strong>{proposal.duration_days} gün</strong></div></div>{proposal.status === 'pending' && job.status === 'open' && <Link href={`/employer/jobs/${id}/proposals`}>Karşılaştır ve karar ver →</Link>}{proposal.status === 'accepted' && <Link href={`/messages/${proposal.id}`}>Mesaj gönder →</Link>}</article> })}{proposals?.length === 0 && <div className="marketplace-empty"><p>Henüz teklif gelmedi.</p></div>}</div></section>}
    </>}
  </MarketplaceShell>
}
