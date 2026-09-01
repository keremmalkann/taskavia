import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MarketplaceShell, Feedback } from '@/app/marketplace-shell'
import { completeJobFromWorkspace } from '@/lib/actions/marketplace'
import { requireUser } from '@/lib/auth/role'
import { MessageThread } from './message-thread'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Çalışma Alanı — İşlik', description: 'Proje mesajlarını ve çalışma durumunu yönet.' }

export default async function MessagesPage({ params, searchParams }: { params: Promise<{ proposalId: string }>; searchParams: Promise<{ error?: string; message?: string }> }) {
  const [{ proposalId }, feedback] = await Promise.all([params, searchParams])
  const { supabase, user, role, fullName } = await requireUser()
  const { data: proposal } = await supabase.from('proposals').select('*, jobs!inner(id, title, status, employer_id, employer:profiles!jobs_employer_id_fkey(full_name, company_name)), freelancer:profiles!proposals_freelancer_id_fkey(id, full_name, title)').eq('id', proposalId).eq('status', 'accepted').maybeSingle()
  if (!proposal) notFound()
  const job = Array.isArray(proposal.jobs) ? proposal.jobs[0] : proposal.jobs
  const freelancer = Array.isArray(proposal.freelancer) ? proposal.freelancer[0] : proposal.freelancer
  const employer = Array.isArray(job.employer) ? job.employer[0] : job.employer
  const { data: messages } = await supabase.from('messages').select('id, sender_id, body, created_at').eq('proposal_id', proposalId).order('created_at', { ascending: true })
  const counterpart = role === 'employer' ? freelancer?.full_name : employer?.company_name || employer?.full_name || 'İşveren'
  const reviewee = role === 'employer' ? proposal.freelancer_id : job.employer_id

  return <MarketplaceShell name={fullName} role={role} active="dashboard">
    <Feedback {...feedback} />
    <div className="workspace-head message-page-head"><div><p>AKTİF ÇALIŞMA ALANI</p><h1>{job.title}</h1><span>{counterpart} ile güvenli proje görüşmesi</span></div><div className="message-page-links"><Link href="/messages">← Tüm mesajlar</Link><Link href={`/jobs/${job.id}`}>İlanı görüntüle →</Link></div></div>
    <div className="workspace-layout message-workspace">
      <MessageThread
        proposalId={proposalId}
        userId={user.id}
        currentUserName={fullName}
        counterpartName={counterpart}
        jobTitle={job.title}
        initialMessages={messages ?? []}
      />
      <aside className="payment-panel message-payment-panel project-completion-panel"><span>PROJE DURUMU</span><h2>{job.status === 'completed' ? 'Çalışma tamamlandı' : 'Çalışma devam ediyor'}</h2><p>{job.status === 'completed' ? 'Proje kapatıldı. Artık çalışma deneyiminizi değerlendirebilirsiniz.' : 'Teslimat ve görüşmeler tamamlandığında işveren çalışmayı kapatabilir.'}</p><div className="message-project-summary"><small>PROJE</small><strong>{job.title}</strong><small>ÇALIŞMA ARKADAŞIN</small><strong>{counterpart}</strong></div><div className="payment-status"><i className={job.status === 'completed' ? 'released' : 'funded'} />{job.status === 'completed' ? 'Çalışma tamamlandı' : 'Aktif çalışma'}</div>
        {role === 'employer' && job.status === 'assigned' && <form action={completeJobFromWorkspace.bind(null, proposalId, job.id)}><button type="submit">Çalışmayı tamamla →</button></form>}
        {job.status === 'completed' && <Link className="review-link" href={`/reviews/new?job=${job.id}&to=${reviewee}`}>Değerlendirme bırak →</Link>}
        <small>{job.status === 'completed' ? 'Her taraf bu proje için yalnızca bir değerlendirme bırakabilir.' : role === 'employer' ? 'Bu işlem projeyi iki taraf için de tamamlandı olarak işaretler.' : 'İşveren çalışmayı tamamladığında değerlendirme alanı açılır.'}</small>
      </aside>
    </div>
  </MarketplaceShell>
}
