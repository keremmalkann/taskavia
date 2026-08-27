import type { Metadata } from 'next'
import { DashboardDate, DashboardShell, StatCard } from '@/app/dashboard-shell'
import { requireRole } from '@/lib/auth/role'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Freelancer Paneli — İşlik',
  description: 'Tekliflerini, projelerini ve kazançlarını İşlik freelancer panelinden yönet.',
}

const jobs = [
  { company: 'Mona Studio', mark: 'MS', time: '2 saat önce', title: 'Mobil uygulama için ürün tasarımcısı', skills: ['Figma', 'UI/UX', 'Design System'], budget: '₺45.000', match: '%96 eşleşme' },
  { company: 'Luma Teknoloji', mark: 'LT', time: '5 saat önce', title: 'Next.js e-ticaret projesi geliştirme', skills: ['Next.js', 'TypeScript', 'Supabase'], budget: '₺72.000', match: '%91 eşleşme' },
  { company: 'Origo', mark: 'OR', time: 'Dün', title: 'Yeni marka kimliği ve sosyal medya seti', skills: ['Branding', 'Illustrator', 'Strategy'], budget: '₺28.500', match: '%87 eşleşme' },
]

export default async function FreelancerPage() {
  const { fullName } = await requireRole('freelancer')
  const firstName = fullName.split(' ')[0]

  return (
    <DashboardShell
      name={fullName}
      roleLabel="Freelancer hesabı"
      action={<button className="dashboard-primary">İşleri keşfet <span>→</span></button>}
      navItems={[
        { label: 'Genel bakış', icon: '◫', active: true },
        { label: 'İşleri keşfet', icon: '⌕' },
        { label: 'Tekliflerim', icon: '◇', badge: '4' },
        { label: 'Aktif projeler', icon: '□', badge: '2' },
        { label: 'Mesajlar', icon: '○', badge: '3' },
      ]}
    >
      <div className="dashboard-heading">
        <div><p>FREELANCER PANELİ</p><h1>Günaydın, {firstName}.</h1><span>Bugün yeteneklerinle eşleşen 12 yeni fırsat var.</span></div>
        <DashboardDate />
      </div>

      <section className="dashboard-stats" aria-label="Hesap özeti">
        <StatCard label="AKTİF TEKLİFLER" value="4" note="2 teklif inceleniyor" />
        <StatCard label="DEVAM EDEN İŞLER" value="2" note="Sonraki teslim: 3 gün" tone="lime" />
        <StatCard label="BU AY KAZANÇ" value="₺38.500" note="Geçen aya göre ↗ %18" tone="dark" />
      </section>

      <section className="dashboard-section">
        <div className="dashboard-section-title"><div><p>SANA ÖZEL</p><h2>Yeni iş fırsatları</h2></div><button>Tümünü gör →</button></div>
        <div className="opportunity-list">
          {jobs.map((job) => (
            <article className="opportunity-card" key={job.title}>
              <div className="opportunity-company"><span>{job.mark}</span><div><strong>{job.company}</strong><small>{job.time}</small></div><em>{job.match}</em></div>
              <h3>{job.title}</h3>
              <div className="opportunity-skills">{job.skills.map((skill) => <span key={skill}>{skill}</span>)}</div>
              <footer><div><small>BÜTÇE</small><strong>{job.budget}</strong></div><button aria-label={`${job.title} ilanını aç`}>→</button></footer>
            </article>
          ))}
        </div>
      </section>
    </DashboardShell>
  )
}
