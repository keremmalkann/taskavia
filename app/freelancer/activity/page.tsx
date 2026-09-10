import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketplaceShell, SetupNotice } from '@/app/marketplace-shell'
import { requireRole } from '@/lib/auth/role'
import { formatCurrency, formatDate } from '@/lib/marketplace'
import { paymentsEnabled } from '@/lib/features'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Çalışmalarım — Taskavia', description: 'Tekliflerini ve proje geçmişini görüntüle.' }

type View = 'proposals' | 'jobs' | 'completed' | 'earnings'
type Employer = { full_name: string | null; company_name: string | null }
type Job = { id: string; title: string; status: string; employer: Employer | Employer[] | null }
type Proposal = { id: string; status: string; price: number; duration_days: number; created_at: string; updated_at: string; job: Job | Job[] | null }
type Payment = { id: string; amount: number; platform_fee: number; status: string; created_at: string; updated_at: string; proposal: { job: { id: string; title: string } | Array<{ id: string; title: string }> | null } | Array<{ job: { id: string; title: string } | Array<{ id: string; title: string }> | null }> | null }

function one<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function proposalStatus(status: string) {
  if (status === 'accepted') return 'Kabul edildi'
  if (status === 'rejected') return 'Başka freelancer seçildi'
  if (status === 'withdrawn') return 'Geri çekildi'
  return 'Değerlendiriliyor'
}

function paymentStatus(status: string) {
  if (status === 'released') return 'Hesabına aktarıldı'
  if (status === 'funded') return 'Güvence hesabında'
  return 'Ödeme bekleniyor'
}

export default async function FreelancerActivityPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const [{ view: requestedView }, { supabase, user, fullName }] = await Promise.all([searchParams, requireRole('freelancer')])
  const view: View = requestedView === 'proposals' || requestedView === 'completed' || (paymentsEnabled && requestedView === 'earnings') ? requestedView : 'jobs'
  const paymentQuery = paymentsEnabled
    ? supabase.from('payments').select('id, amount, platform_fee, status, created_at, updated_at, proposal:proposals!inner(job:jobs!inner(id, title))').eq('freelancer_id', user.id).order('updated_at', { ascending: false })
    : Promise.resolve({ data: [], error: null })
  const [{ data: proposalData, error: proposalError }, { data: paymentData, error: paymentError }] = await Promise.all([
    supabase.from('proposals').select('id, status, price, duration_days, created_at, updated_at, job:jobs!inner(id, title, status, employer:profiles!jobs_employer_id_fkey(full_name, company_name))').eq('freelancer_id', user.id).order('updated_at', { ascending: false }),
    paymentQuery,
  ])
  const proposals = (proposalData ?? []) as unknown as Proposal[]
  const payments = (paymentData ?? []) as unknown as Payment[]
  const pendingProposals = proposals.filter((proposal) => proposal.status === 'pending')
  const ongoingProposals = proposals.filter((proposal) => proposal.status === 'accepted' && one(proposal.job)?.status === 'assigned')
  const completedProposals = proposals.filter((proposal) => proposal.status === 'accepted' && one(proposal.job)?.status === 'completed')
  const visibleProposals = view === 'jobs' ? ongoingProposals : view === 'completed' ? completedProposals : pendingProposals
  const visiblePayments = payments.filter((payment) => payment.status === 'released')
  const title = view === 'proposals' ? 'Aktif tekliflerim' : view === 'earnings' ? 'Kazançlarım' : view === 'completed' ? 'Tamamlanan işlerim' : 'Devam eden işlerim'
  const description = view === 'proposals' ? 'İşverenlerin değerlendirmesini bekleyen tekliflerini takip et.' : view === 'earnings' ? 'Tamamlanan ödemeleri ve net kazancını görüntüle.' : view === 'completed' ? 'Tamamlanan projelerini ve değerlendirme adımlarını görüntüle.' : 'Kabul edilen ve çalışması devam eden projelerine ulaş.'

  return <MarketplaceShell name={fullName} role="freelancer" active="dashboard">
    <div className="workspace-head activity-head"><div><p>ÇALIŞMALARIM</p><h1>{title}</h1><span>{description}</span></div><Link href="/freelancer">← Genel bakışa dön</Link></div>
    <nav className="activity-tabs" aria-label="Çalışma detayları">
      <Link className={view === 'proposals' ? 'active' : ''} aria-current={view === 'proposals' ? 'page' : undefined} href="/freelancer/activity?view=proposals"><span className="activity-tab-icon" aria-hidden="true">↗</span><span className="activity-tab-copy"><strong>Aktif teklifler</strong><small>Yanıt bekleyen başvurular</small></span><em>{pendingProposals.length}</em></Link>
      <Link className={view === 'jobs' ? 'active' : ''} aria-current={view === 'jobs' ? 'page' : undefined} href="/freelancer/activity?view=jobs"><span className="activity-tab-icon" aria-hidden="true">◇</span><span className="activity-tab-copy"><strong>Devam eden işler</strong><small>Çalışma alanların</small></span><em>{ongoingProposals.length}</em></Link>
      {paymentsEnabled ? <Link className={view === 'earnings' ? 'active' : ''} aria-current={view === 'earnings' ? 'page' : undefined} href="/freelancer/activity?view=earnings"><span className="activity-tab-icon" aria-hidden="true">₺</span><span className="activity-tab-copy"><strong>Kazançlar</strong><small>Tamamlanan ödemeler</small></span><em>{visiblePayments.length}</em></Link> : <Link className={view === 'completed' ? 'active' : ''} aria-current={view === 'completed' ? 'page' : undefined} href="/freelancer/activity?view=completed"><span className="activity-tab-icon" aria-hidden="true">✓</span><span className="activity-tab-copy"><strong>Tamamlanan işler</strong><small>Proje geçmişin</small></span><em>{completedProposals.length}</em></Link>}
    </nav>
    {(proposalError || paymentError) ? <SetupNotice /> : view === 'earnings' ? <section className="activity-list">
      {visiblePayments.map((payment) => {
        const proposal = one(payment.proposal)
        const job = one(proposal?.job)
        const net = Number(payment.amount) - Number(payment.platform_fee)
        return <article className="activity-card" key={payment.id}><div><span>ÖDEME</span><h2>{job?.title || 'Tamamlanan proje'}</h2><p>{paymentStatus(payment.status)} · {formatDate(payment.updated_at || payment.created_at)}</p></div><div className="activity-numbers"><small>NET KAZANÇ</small><strong>{formatCurrency(net)}</strong><em>Brüt {formatCurrency(payment.amount)}</em></div></article>
      })}
      {visiblePayments.length === 0 && <div className="marketplace-empty"><strong>Henüz aktarılmış kazancın yok</strong><p>Tamamlanan bir işin ödemesi serbest bırakıldığında burada görünecek.</p></div>}
    </section> : <section className="activity-list">
      {visibleProposals.map((proposal) => {
        const job = one(proposal.job)
        const employer = one(job?.employer)
        return <article className="activity-card" key={proposal.id}><div><span>{view === 'jobs' ? 'DEVAM EDEN PROJE' : view === 'completed' ? 'TAMAMLANAN PROJE' : 'AKTİF TEKLİF'}</span><h2>{job?.title || 'Proje'}</h2><p>{employer?.company_name || employer?.full_name || 'Taskavia işvereni'} · {view === 'completed' ? 'Tamamlandı' : proposalStatus(proposal.status)}</p></div><div className="activity-numbers"><small>TEKLİFİN</small><strong>{formatCurrency(proposal.price)}</strong><em>{proposal.duration_days} gün</em></div><div className="activity-actions"><Link href={`/jobs/${job?.id}`}>İlanı görüntüle</Link>{proposal.status === 'pending' && job?.status === 'open' && <Link className="primary" href={`/jobs/${job.id}#manage-proposal`}>Düzenle / geri çek →</Link>}{proposal.status === 'accepted' && <Link className="primary" href={`/messages/${proposal.id}`}>{view === 'completed' ? 'Özet ve değerlendirme →' : 'Çalışma alanına git →'}</Link>}</div></article>
      })}
      {visibleProposals.length === 0 && <div className="marketplace-empty"><strong>{view === 'jobs' ? 'Devam eden işin yok' : view === 'completed' ? 'Henüz tamamlanan işin yok' : 'Bekleyen teklifin yok'}</strong><p>{view === 'jobs' ? 'Kabul edilen bir proje çalışma durumundayken burada görünecek; tamamlandığında geçmişe taşınacak.' : view === 'completed' ? 'İşveren bir çalışmayı tamamladığında proje burada görünecek.' : 'Yeni bir ilana teklif verdiğinde değerlendirme sürecini burada izleyebilirsin.'}</p></div>}
    </section>}
  </MarketplaceShell>
}
