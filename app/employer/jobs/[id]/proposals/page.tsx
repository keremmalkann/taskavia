import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Feedback, MarketplaceShell, SetupNotice } from '@/app/marketplace-shell'
import { PendingSubmitButton } from '@/app/pending-submit-button'
import { acceptProposal, rejectProposal } from '@/lib/actions/marketplace'
import { saveCandidateNote } from '@/lib/actions/candidate-notes'
import { requireRole } from '@/lib/auth/role'
import { formatCurrency, formatDate } from '@/lib/marketplace'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Teklif İnceleme — Taskavia', description: 'Bir ilana gelen freelancer tekliflerini incele ve değerlendir.' }

type Freelancer = {
  id: string
  full_name: string
  title: string | null
  skills: string[] | null
  hourly_rate: number | null
  experience_years: number | null
}

type Proposal = {
  id: string
  freelancer_id: string
  price: number
  duration_days: number
  message: string
  status: string
  created_at: string
  updated_at: string
  freelancer: Freelancer | Freelancer[] | null
}

const statusLabel: Record<string, string> = {
  pending: 'Değerlendiriliyor',
  accepted: 'Kabul edildi',
  rejected: 'Reddedildi',
}

const proposalSorts = ['recommended', 'newest', 'price_asc', 'duration_asc', 'rating_desc', 'match_desc'] as const
type ProposalSort = (typeof proposalSorts)[number]

export default async function ProposalComparisonPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; message?: string; sort?: string }> }) {
  const [{ id }, feedback] = await Promise.all([params, searchParams])
  const { supabase, user, fullName } = await requireRole('employer')
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('id, employer_id, title, category, skills, budget_min, budget_max, deadline, status')
    .eq('id', id)
    .eq('employer_id', user.id)
    .maybeSingle()

  if (!job && !jobError) notFound()

  const { data: proposalData, error: proposalError } = job
    ? await supabase
      .from('proposals')
      .select('id, freelancer_id, price, duration_days, message, status, created_at, updated_at, freelancer:profiles!proposals_freelancer_id_fkey(id, full_name, title, skills, hourly_rate, experience_years)')
      .eq('job_id', id)
      .order('created_at', { ascending: true })
    : { data: null, error: null }

  const proposals = ((proposalData ?? []) as Proposal[]).filter((proposal) => proposal.status !== 'withdrawn')
  const freelancerIds = proposals.map((proposal) => proposal.freelancer_id)
  const [{ data: reviews }, { data: portfolioItems }, { data: candidateNotes, error: candidateNotesError }] = freelancerIds.length
    ? await Promise.all([
      supabase.from('reviews').select('reviewee_id, rating').in('reviewee_id', freelancerIds),
      supabase.from('portfolio_items').select('profile_id').in('profile_id', freelancerIds),
      supabase.from('proposal_notes').select('proposal_id, note').in('proposal_id', proposals.map((proposal) => proposal.id)),
    ])
    : [{ data: [] }, { data: [] }, { data: [], error: null }]

  const reviewSummary = new Map<string, { total: number; count: number }>()
  reviews?.forEach((review) => {
    const current = reviewSummary.get(review.reviewee_id) ?? { total: 0, count: 0 }
    reviewSummary.set(review.reviewee_id, { total: current.total + Number(review.rating), count: current.count + 1 })
  })
  const portfolioCounts = new Map<string, number>()
  portfolioItems?.forEach((item) => portfolioCounts.set(item.profile_id, (portfolioCounts.get(item.profile_id) ?? 0) + 1))
  const noteByProposal = new Map(candidateNotes?.map((item) => [item.proposal_id, item.note]) ?? [])

  const selectedSort: ProposalSort = proposalSorts.includes(feedback.sort as ProposalSort) ? feedback.sort as ProposalSort : 'recommended'
  const proposalStats = (proposal: Proposal) => {
    const freelancer = Array.isArray(proposal.freelancer) ? proposal.freelancer[0] : proposal.freelancer
    const review = reviewSummary.get(proposal.freelancer_id)
    const rating = review ? review.total / review.count : 0
    const matches = freelancer?.skills?.filter((skill) => job?.skills?.some((wanted: string) => wanted.toLocaleLowerCase('tr-TR') === skill.toLocaleLowerCase('tr-TR'))).length ?? 0
    return { rating, matches, portfolio: portfolioCounts.get(proposal.freelancer_id) ?? 0 }
  }
  const sortedProposals = [...proposals].sort((a, b) => {
    if (selectedSort === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    if (selectedSort === 'price_asc') return Number(a.price) - Number(b.price)
    if (selectedSort === 'duration_asc') return Number(a.duration_days) - Number(b.duration_days)
    if (selectedSort === 'rating_desc') return proposalStats(b).rating - proposalStats(a).rating
    if (selectedSort === 'match_desc') return proposalStats(b).matches - proposalStats(a).matches
    const aStats = proposalStats(a)
    const bStats = proposalStats(b)
    const aScore = aStats.matches * 10 + aStats.rating * 2 + Math.min(aStats.portfolio, 5) - Number(a.price) / Math.max(Number(job?.budget_max ?? 1), 1)
    const bScore = bStats.matches * 10 + bStats.rating * 2 + Math.min(bStats.portfolio, 5) - Number(b.price) / Math.max(Number(job?.budget_max ?? 1), 1)
    return bScore - aScore
  })

  const lowestPrice = proposals.length ? Math.min(...proposals.map((proposal) => Number(proposal.price))) : 0
  const shortestDuration = proposals.length ? Math.min(...proposals.map((proposal) => Number(proposal.duration_days))) : 0
  const accepted = proposals.find((proposal) => proposal.status === 'accepted')
  const isSingleProposal = proposals.length === 1

  return <MarketplaceShell name={fullName} role="employer" active="dashboard">
    <Feedback {...feedback} />
    {(jobError || proposalError) && <SetupNotice />}
    {job && <>
      <header className="comparison-head">
        <div><p>{isSingleProposal ? 'TEKLİF İNCELEME VE ONAY' : 'TEKLİF KARŞILAŞTIRMA'}</p><h1>{job.title}</h1><span>{job.category} · {formatCurrency(job.budget_min)} – {formatCurrency(job.budget_max)} · Son tarih: {formatDate(job.deadline)}</span></div>
        <Link href={`/jobs/${job.id}`}>İlanı görüntüle →</Link>
      </header>

      <section className={`comparison-summary ${isSingleProposal ? 'single' : ''}`} aria-label="Teklif özeti">
        <div><small>GELEN TEKLİF</small><strong>{proposals.length}</strong><span>{proposals.length ? 'Toplam aday' : 'Henüz aday yok'}</span></div>
        <div><small>{isSingleProposal ? 'TEKLİF TUTARI' : 'EN DÜŞÜK TEKLİF'}</small><strong>{proposals.length ? formatCurrency(lowestPrice) : '—'}</strong><span>{isSingleProposal ? 'Adayın sunduğu çalışma bedeli' : 'Karar verirken kapsamı da değerlendir'}</span></div>
        <div><small>{isSingleProposal ? 'TESLİM SÜRESİ' : 'EN KISA SÜRE'}</small><strong>{proposals.length ? `${shortestDuration} gün` : '—'}</strong><span>Tahmini teslim süresi</span></div>
        <div className="comparison-brief"><small>ARANAN BECERİLER</small><div>{job.skills?.length ? job.skills.map((skill: string) => <span key={skill}>{skill}</span>) : <span>Belirtilmedi</span>}</div></div>
      </section>

      {accepted && <div className="comparison-accepted"><div><span>SEÇİM TAMAMLANDI</span><strong>{(Array.isArray(accepted.freelancer) ? accepted.freelancer[0] : accepted.freelancer)?.full_name} ile çalışma başladı.</strong></div><Link href={`/messages/${accepted.id}`}>Çalışma alanına git →</Link></div>}

      {proposals.length > 1 && <form className="proposal-sort-bar" method="get">
        <div><strong>Adayları sırala</strong><span>Karar verirken teklifin yanında deneyim ve beceri eşleşmesini de değerlendir.</span></div>
        <label>Sıralama<select name="sort" defaultValue={selectedSort}><option value="recommended">Önerilen sıralama</option><option value="newest">En yeni teklif</option><option value="price_asc">En düşük fiyat</option><option value="duration_asc">En kısa teslim</option><option value="rating_desc">En yüksek puan</option><option value="match_desc">En fazla beceri eşleşmesi</option></select></label>
        <button type="submit">Uygula</button>
      </form>}
      {candidateNotesError && <p className="candidate-note-setup" role="status">Özel aday notları için son veritabanı migration dosyasını çalıştırmalısın.</p>}

      <section className={`comparison-grid ${isSingleProposal ? 'single' : ''}`}>
        {sortedProposals.map((proposal) => {
          const freelancer = Array.isArray(proposal.freelancer) ? proposal.freelancer[0] : proposal.freelancer
          const summary = reviewSummary.get(proposal.freelancer_id)
          const averageRating = summary ? (summary.total / summary.count).toFixed(1) : null
          const skillMatches = freelancer?.skills?.filter((skill) => job.skills?.some((wanted: string) => wanted.toLocaleLowerCase('tr-TR') === skill.toLocaleLowerCase('tr-TR'))) ?? []

          return <article key={proposal.id} className={`comparison-card ${proposal.status === 'accepted' ? 'selected' : ''}`}>
            <header><div className="comparison-avatar">{freelancer?.full_name?.slice(0, 2).toLocaleUpperCase('tr-TR') || 'FR'}</div><div><h2>{freelancer?.full_name || 'Freelancer'}</h2><p>{freelancer?.title || 'Freelancer'}</p></div><span className={`comparison-status ${proposal.status}`}>{statusLabel[proposal.status] ?? proposal.status}</span></header>
            <div className="comparison-price"><div><small>TEKLİF</small><strong>{formatCurrency(proposal.price)}</strong>{Number(proposal.price) === lowestPrice && proposals.length > 1 && <em>En düşük</em>}</div><div><small>TESLİM</small><strong>{proposal.duration_days} gün</strong>{Number(proposal.duration_days) === shortestDuration && proposals.length > 1 && <em>En hızlı</em>}</div></div>
            <dl className="comparison-facts">
              <div><dt>Deneyim</dt><dd>{freelancer?.experience_years != null ? `${freelancer.experience_years} yıl` : 'Belirtilmedi'}</dd></div>
              <div><dt>Saatlik ücret</dt><dd>{freelancer?.hourly_rate != null ? formatCurrency(freelancer.hourly_rate) : 'Belirtilmedi'}</dd></div>
              <div><dt>Değerlendirme</dt><dd>{averageRating ? `★ ${averageRating} (${summary?.count})` : 'Henüz yok'}</dd></div>
              <div><dt>Portföy</dt><dd>{portfolioCounts.get(proposal.freelancer_id) ?? 0} çalışma</dd></div>
            </dl>
            <div className="comparison-skills"><small>BECERİ EŞLEŞMESİ</small><div>{freelancer?.skills?.length ? freelancer.skills.map((skill) => <span key={skill} className={skillMatches.includes(skill) ? 'matched' : ''}>{skill}</span>) : <span>Henüz beceri eklenmemiş</span>}</div></div>
            <div className="comparison-message"><small>ADAYIN MESAJI</small><p>{proposal.message}</p></div>
            {!candidateNotesError && <form className="candidate-note-form" action={saveCandidateNote.bind(null, job.id, proposal.id)}>
              <label><span>ÖZEL ADAY NOTUN</span><textarea name="note" rows={3} maxLength={1000} defaultValue={noteByProposal.get(proposal.id) ?? ''} placeholder="Görüşme notu, güçlü yön veya takip edilecek konu…" /></label>
              <div><small>Bu notu yalnızca sen görebilirsin.</small><PendingSubmitButton pendingLabel="Kaydediliyor…">Notu kaydet</PendingSubmitButton></div>
            </form>}
            <footer className="comparison-card-footer">
              <div className="comparison-footer-meta"><span>{formatDate(proposal.created_at)} tarihinde gönderildi</span><Link className="comparison-profile-link" href={`/profiles/${proposal.freelancer_id}`}>Profili ve portföyü incele →</Link></div>
              {proposal.status === 'pending' && job.status === 'open' && <div className="comparison-decision-actions" aria-label="Teklif kararı"><form action={rejectProposal.bind(null, job.id, proposal.id, proposal.updated_at)}><PendingSubmitButton className="reject" pendingLabel="Reddediliyor…">Teklifi reddet</PendingSubmitButton></form><form action={acceptProposal.bind(null, job.id, proposal.id, proposal.updated_at)}><PendingSubmitButton className="accept" pendingLabel="Kabul ediliyor…">Teklifi kabul et →</PendingSubmitButton></form></div>}
              {proposal.status === 'accepted' && <Link href={`/messages/${proposal.id}`}>Mesajlaşmaya git →</Link>}
            </footer>
          </article>
        })}
        {!proposalError && proposals.length === 0 && <div className="marketplace-empty comparison-empty"><strong>Henüz teklif gelmedi.</strong><p>İlan yayında kaldığı sürece yeni adaylar burada karşılaştırmaya hazır olarak görünecek.</p><Link href={`/jobs/${job.id}`}>İlana dön →</Link></div>}
      </section>
    </>}
  </MarketplaceShell>
}
