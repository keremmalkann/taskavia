import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MarketplaceShell } from '@/app/marketplace-shell'
import { requireUser } from '@/lib/auth/role'
import { formatDate } from '@/lib/marketplace'
import { PrintSummary } from './print-summary'
import './summary.css'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Çalışma özeti — Taskavia' }

export default async function WorkSummaryPage({ params }: { params: Promise<{ proposalId: string }> }) {
  const { proposalId } = await params
  const { supabase, user, role, fullName } = await requireUser()
  const { data: proposal, error } = await supabase.from('proposals')
    .select('id, freelancer_id, price, duration_days, message, jobs!inner(id, employer_id, title, description, category, deadline, status, employer:profiles!jobs_employer_id_fkey(full_name, company_name)), freelancer:profiles!proposals_freelancer_id_fkey(full_name)')
    .eq('id', proposalId).eq('status', 'accepted').maybeSingle()
  if (error) throw new Error('Çalışma özeti yüklenemedi.')
  if (!proposal) notFound()
  const job = Array.isArray(proposal.jobs) ? proposal.jobs[0] : proposal.jobs
  if (!job || (user.id !== job.employer_id && user.id !== proposal.freelancer_id)) notFound()
  const employer = Array.isArray(job.employer) ? job.employer[0] : job.employer
  const freelancer = Array.isArray(proposal.freelancer) ? proposal.freelancer[0] : proposal.freelancer
  const amount = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 }).format(Number(proposal.price))
  const status = job.status === 'completed' ? 'Tamamlandı' : job.status === 'assigned' ? 'Devam ediyor' : 'Kapalı'

  return <MarketplaceShell name={fullName} role={role} active="dashboard">
    <div className="work-summary">
      <div className="work-summary-toolbar"><Link href={`/messages/${proposalId}`}>← Çalışma alanına dön</Link><PrintSummary /></div>
      <article className="work-summary-document">
        <header><span>TASKAVIA · ÇALIŞMA ÖZETİ</span><h1>{job.title}</h1><p>{job.category} <strong>{status}</strong></p></header>
        <dl className="work-summary-parties"><div><dt>İşveren</dt><dd>{employer?.company_name || employer?.full_name || 'İşveren'}</dd></div><div><dt>Freelancer</dt><dd>{freelancer?.full_name || 'Freelancer'}</dd></div></dl>
        <dl className="work-summary-terms"><div><dt>Kabul edilen teklif</dt><dd>{amount}</dd></div><div><dt>Teklifteki teslim süresi</dt><dd>{proposal.duration_days} gün</dd></div><div><dt>İlandaki son tarih</dt><dd>{formatDate(job.deadline)}</dd></div></dl>
        <section><h2>Proje kapsamı</h2><p>{job.description}</p></section>
        <section><h2>Kabul edilen teklifin açıklaması</h2><p>{proposal.message}</p></section>
        <footer>Bu özet, ilanın ve kabul edilen teklifin mevcut bilgilerini gösterir. Karşılıklı sözleşme onayı veya ödeme alındığı anlamına gelmez.</footer>
      </article>
    </div>
  </MarketplaceShell>
}
