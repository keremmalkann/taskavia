import type { Metadata } from 'next'
import { DashboardDate, DashboardShell, StatCard } from '@/app/dashboard-shell'
import { requireRole } from '@/lib/auth/role'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'İşveren Paneli — İşlik',
  description: 'Projelerini, adaylarını ve ekip çalışmalarını İşlik işveren panelinden yönet.',
}

const projects = [
  { title: 'Mobil bankacılık uygulaması UI/UX', proposals: 8, status: 'Teklif alıyor', budget: '₺45.000', color: 'coral' },
  { title: 'Kurumsal web sitesi geliştirme', proposals: 6, status: 'Görüşmeler', budget: '₺72.000', color: 'blue' },
  { title: '2026 sosyal medya içerik paketi', proposals: 4, status: 'Teklif alıyor', budget: '₺28.500', color: 'lime' },
]

export default async function EmployerPage() {
  const { fullName } = await requireRole('employer')
  const firstName = fullName.split(' ')[0]

  return (
    <DashboardShell
      name={fullName}
      roleLabel="İşveren hesabı"
      action={<button className="dashboard-primary">Yeni proje yayınla <span>＋</span></button>}
      navItems={[
        { label: 'Genel bakış', icon: '◫', active: true },
        { label: 'Projelerim', icon: '□', badge: '3' },
        { label: 'Adaylar', icon: '♙', badge: '18' },
        { label: 'Mesajlar', icon: '○', badge: '5' },
        { label: 'Ödemeler', icon: '◇' },
      ]}
    >
      <div className="dashboard-heading">
        <div><p>İŞVEREN PANELİ</p><h1>Merhaba, {firstName}.</h1><span>Projelerinde bugün 7 yeni teklif ve 3 yeni mesaj var.</span></div>
        <DashboardDate />
      </div>

      <section className="dashboard-stats" aria-label="Hesap özeti">
        <StatCard label="AKTİF PROJELER" value="3" note="1 proje bu hafta bitiyor" />
        <StatCard label="YENİ TEKLİFLER" value="18" note="Bugün 7 yeni teklif" tone="blue" />
        <StatCard label="TOPLAM HARCAMA" value="₺126.000" note="3 aktif sözleşme" tone="dark" />
      </section>

      <section className="dashboard-section employer-projects">
        <div className="dashboard-section-title"><div><p>PROJELERİN</p><h2>İşe alım gündemi</h2></div><button>Tüm projeler →</button></div>
        <div className="project-table">
          <div className="project-table-head"><span>PROJE</span><span>TEKLİFLER</span><span>DURUM</span><span>BÜTÇE</span><span /></div>
          {projects.map((project) => (
            <article key={project.title}>
              <div className="project-name"><span className={`project-color ${project.color}`} /><strong>{project.title}</strong></div>
              <span>{project.proposals} aday</span>
              <span className="project-status">{project.status}</span>
              <strong>{project.budget}</strong>
              <button aria-label={`${project.title} projesini aç`}>→</button>
            </article>
          ))}
        </div>
      </section>

      <section className="employer-bottom-grid">
        <article className="candidate-panel">
          <p>ÖNE ÇIKAN ADAY</p><div className="candidate-avatar">EK</div><h3>Elif Kaya</h3><span>Senior Product Designer</span>
          <div className="candidate-tags"><span>Figma</span><span>Fintech</span><span>4.9 ★</span></div>
          <button>Profili incele →</button>
        </article>
        <article className="employer-tip"><span>✦ İŞLİK ÖNERİSİ</span><h3>Daha iyi teklifler almak için proje kapsamını netleştir.</h3><p>Net teslimatlar ve örnek referanslar, doğru yeteneklerle %35 daha hızlı eşleşmeni sağlar.</p><button>Projeyi düzenle →</button></article>
      </section>
    </DashboardShell>
  )
}
