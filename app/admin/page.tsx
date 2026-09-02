import type { Metadata } from 'next'
import Link from 'next/link'
import { Feedback, MarketplaceShell, SetupNotice } from '@/app/marketplace-shell'
import { changeJobVisibility, changeUserAccess } from '@/lib/actions/admin'
import { requireAdmin } from '@/lib/auth/admin'
import { formatCurrency, formatDate } from '@/lib/marketplace'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Yönetim Paneli — İşlik', description: 'İşlik kullanıcılarını, ilanlarını ve platform hareketlerini yönet.' }

type Profile = { id: string; full_name: string; role: string; created_at: string }
type Job = { id: string; title: string; category: string; status: string; budget_max: number; created_at: string; employer_id: string; employer: { full_name: string } | { full_name: string }[] | null }

function isBanned(until?: string | null) {
  return Boolean(until && new Date(until).getTime() > Date.now())
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const feedback = await searchParams
  const { admin, user, role, fullName } = await requireAdmin()
  const [authUsersResult, profilesResult, jobsResult, proposalCountResult, messageCountResult, reviewCountResult] = await Promise.all([
    admin.auth.admin.listUsers({ page: 1, perPage: 100 }),
    admin.from('profiles').select('id, full_name, role, created_at').order('created_at', { ascending: false }).limit(100),
    admin.from('jobs').select('id, title, category, status, budget_max, created_at, employer_id, employer:profiles!jobs_employer_id_fkey(full_name)').order('created_at', { ascending: false }).limit(20),
    admin.from('proposals').select('id', { count: 'exact', head: true }),
    admin.from('messages').select('id', { count: 'exact', head: true }),
    admin.from('reviews').select('id', { count: 'exact', head: true }),
  ])

  const profiles = (profilesResult.data ?? []) as Profile[]
  const jobs = (jobsResult.data ?? []) as Job[]
  const authUsers = authUsersResult.data?.users ?? []
  const authById = new Map(authUsers.map((entry) => [entry.id, entry]))
  const hasLoadError = Boolean(authUsersResult.error || profilesResult.error || jobsResult.error)
  const openJobs = jobs.filter((job) => job.status === 'open').length
  const suspendedUsers = authUsers.filter((entry) => isBanned(entry.banned_until)).length

  return <MarketplaceShell name={fullName} role={role} active="admin">
    <Feedback {...feedback} />
    <header className="admin-head"><div><p>İŞLİK YÖNETİMİ</p><h1>Platform kontrol merkezi.</h1><span>Kullanıcıları, ilanları ve platform hareketlerini tek ekrandan takip et.</span></div><div><Link href={role === 'employer' ? '/employer' : '/freelancer'}>Panele dön</Link><Link href="/settings">Ayarlar</Link></div></header>
    <section className="admin-stats" aria-label="Platform özeti"><article><small>KULLANICILAR</small><strong>{profiles.length}</strong><span>{suspendedUsers} askıya alınmış hesap</span></article><article><small>AÇIK İLANLAR</small><strong>{openJobs}</strong><span>{jobs.length} görüntülenen ilan</span></article><article><small>TEKLİFLER</small><strong>{proposalCountResult.count ?? 0}</strong><span>Toplam gönderilen teklif</span></article><article><small>MESAJLAR</small><strong>{messageCountResult.count ?? 0}</strong><span>{reviewCountResult.count ?? 0} değerlendirme</span></article></section>
    {hasLoadError && <SetupNotice />}
    <section className="admin-grid">
      <article className="admin-panel"><header><div><p>KULLANICI YÖNETİMİ</p><h2>Son kayıtlar</h2></div><span>{profiles.length} hesap</span></header><div className="admin-list">{profiles.map((profile) => { const authUser = authById.get(profile.id); const banned = isBanned(authUser?.banned_until); const isCurrentAdmin = profile.id === user.id; return <div className="admin-user-row" key={profile.id}><div className="admin-avatar">{profile.full_name.slice(0, 2).toLocaleUpperCase('tr-TR')}</div><div><strong>{profile.full_name || authUser?.email || 'İşlik üyesi'}</strong><small>{authUser?.email ?? 'E-posta bulunamadı'} · {formatDate(profile.created_at)}</small></div><span className={banned ? 'suspended' : ''}>{banned ? 'ASKIDA' : profile.role === 'employer' ? 'İŞVEREN' : 'FREELANCER'}</span>{isCurrentAdmin ? <em>YÖNETİCİ</em> : <form action={changeUserAccess.bind(null, profile.id, banned ? 'activate' : 'suspend')}><button className={banned ? 'activate' : ''} type="submit">{banned ? 'Etkinleştir' : 'Askıya al'}</button></form>}</div>})}{profiles.length === 0 && <div className="marketplace-empty"><p>Kullanıcı bulunamadı.</p></div>}</div></article>
      <article className="admin-panel"><header><div><p>İLAN DENETİMİ</p><h2>Son ilanlar</h2></div><Link href="/jobs">İlanları aç →</Link></header><div className="admin-list">{jobs.map((job) => { const employer = Array.isArray(job.employer) ? job.employer[0] : job.employer; const manageable = job.status === 'open' || job.status === 'cancelled'; return <div className="admin-job-row" key={job.id}><div><small>{job.category} · {formatDate(job.created_at)}</small><strong>{job.title}</strong><span>{employer?.full_name ?? 'İşveren'} · {formatCurrency(job.budget_max)}</span></div><em className={job.status}>{job.status}</em><Link href={`/jobs/${job.id}`}>İncele</Link>{manageable && <form action={changeJobVisibility.bind(null, job.id, job.status === 'open' ? 'cancel' : 'reopen')}><button className={job.status === 'cancelled' ? 'activate' : ''} type="submit">{job.status === 'open' ? 'Yayından kaldır' : 'Yeniden yayınla'}</button></form>}</div>})}{jobs.length === 0 && <div className="marketplace-empty"><p>İlan bulunamadı.</p></div>}</div></article>
    </section>
  </MarketplaceShell>
}
