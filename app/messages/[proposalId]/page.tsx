import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MarketplaceShell, Feedback } from '@/app/marketplace-shell'
import { releasePayment, startCheckout } from '@/lib/actions/marketplace'
import { requireUser } from '@/lib/auth/role'
import { formatCurrency } from '@/lib/marketplace'
import { MessageThread } from './message-thread'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Çalışma Alanı — İşlik', description: 'Proje mesajları ve güvenli ödeme alanı.' }

export default async function MessagesPage({ params, searchParams }: { params: Promise<{ proposalId: string }>; searchParams: Promise<{ error?: string; message?: string }> }) {
  const [{ proposalId }, feedback] = await Promise.all([params, searchParams])
  const { supabase, user, role, fullName } = await requireUser()
  const { data: proposal } = await supabase.from('proposals').select('*, jobs!inner(id, title, status, employer_id), freelancer:profiles!proposals_freelancer_id_fkey(id, full_name, title), payments(id, amount, platform_fee, status)').eq('id', proposalId).eq('status', 'accepted').maybeSingle()
  if (!proposal) notFound()
  const job = Array.isArray(proposal.jobs) ? proposal.jobs[0] : proposal.jobs
  const freelancer = Array.isArray(proposal.freelancer) ? proposal.freelancer[0] : proposal.freelancer
  const payment = Array.isArray(proposal.payments) ? proposal.payments[0] : proposal.payments
  const { data: messages } = await supabase.from('messages').select('id, sender_id, body, created_at').eq('proposal_id', proposalId).order('created_at', { ascending: true })
  const counterpart = role === 'employer' ? freelancer?.full_name : 'İşveren'
  const reviewee = role === 'employer' ? proposal.freelancer_id : job.employer_id

  return <MarketplaceShell name={fullName} role={role} active="dashboard">
    <Feedback {...feedback} />
    <div className="workspace-head"><div><p>AKTİF ÇALIŞMA ALANI</p><h1>{job.title}</h1><span>{counterpart} ile güvenli proje alanı</span></div><Link href={`/jobs/${job.id}`}>İlanı görüntüle →</Link></div>
    <div className="workspace-layout">
      <MessageThread proposalId={proposalId} userId={user.id} initialMessages={messages ?? []} />
      <aside className="payment-panel"><span>GÜVENLİ ÖDEME</span><h2>{formatCurrency(proposal.price)}</h2><p>Platform hizmet bedeli dahil proje bütçesi.</p><div className="payment-status"><i className={payment?.status ?? 'pending'} />{payment?.status === 'funded' ? 'Ödeme emanette' : payment?.status === 'released' ? 'Freelancer’a aktarıldı' : 'Ödeme bekleniyor'}</div>
        {role === 'employer' && !payment && <form action={startCheckout.bind(null, proposalId)}><button type="submit">Stripe ile öde →</button></form>}
        {role === 'employer' && payment?.status === 'funded' && job.status === 'completed' && <form action={releasePayment.bind(null, proposalId)}><button type="submit">Ödemeyi serbest bırak →</button></form>}
        {job.status === 'completed' && <Link className="review-link" href={`/reviews/new?job=${job.id}&to=${reviewee}`}>Değerlendirme bırak →</Link>}
        <small>Stripe Connect etkin değilse ödeme butonu yapılandırma uyarısı verir. Gerçek para akışı için platform hesabı doğrulanmalıdır.</small>
      </aside>
    </div>
  </MarketplaceShell>
}
