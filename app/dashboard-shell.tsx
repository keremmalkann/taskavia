import Link from 'next/link'
import { signOut } from '@/lib/actions/auth'

type NavItem = { label: string; icon: string; href?: string; active?: boolean; badge?: string }

export function DashboardShell({ name, roleLabel, navItems, action, children }: {
  name: string
  roleLabel: string
  navItems: NavItem[]
  action: React.ReactNode
  children: React.ReactNode
}) {
  const initials = name.split(' ').slice(0, 2).map((part) => part[0]).join('').toLocaleUpperCase('tr-TR')

  return (
    <main className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <Link className="brand dashboard-brand" href="/"><span className="brand-mark">i</span><span>işlik</span></Link>
        <nav className="dashboard-nav" aria-label="Panel menüsü">
          <p>MENÜ</p>
          {navItems.map((item) => (
            <Link className={item.active ? 'active' : ''} href={item.href ?? '#'} key={item.label}>
              <span className="dashboard-nav-icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
              {item.badge && <strong>{item.badge}</strong>}
            </Link>
          ))}
        </nav>
        <div className="dashboard-profile">
          <span className="dashboard-avatar">{initials}</span>
          <div><strong>{name}</strong><small>{roleLabel}</small></div>
        </div>
        <form action={signOut} className="dashboard-logout">
          <button type="submit"><span aria-hidden="true">↗</span><span>Çıkış yap</span></button>
        </form>
      </aside>
      <section className="dashboard-content">
        <header className="dashboard-topbar">
          <div><span className="status-dot" /> Hesabın aktif</div>
          <div className="dashboard-top-actions"><button aria-label="Bildirimler">◎</button>{action}</div>
        </header>
        {children}
      </section>
    </main>
  )
}

export function StatCard({ label, value, note, tone = 'paper' }: { label: string; value: string; note: string; tone?: 'paper' | 'lime' | 'dark' | 'blue' }) {
  return <article className={`dashboard-stat dashboard-stat-${tone}`}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>
}

export function DashboardDate() {
  const now = new Date()
  const month = new Intl.DateTimeFormat('tr-TR', { month: 'long', timeZone: 'Europe/Istanbul' }).format(now).toLocaleUpperCase('tr-TR')
  const day = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', timeZone: 'Europe/Istanbul' }).format(now)
  const weekday = new Intl.DateTimeFormat('tr-TR', { weekday: 'long', timeZone: 'Europe/Istanbul' }).format(now)

  return <div className="dashboard-date"><small>{month}</small><strong>{day}</strong><span>{weekday}</span></div>
}
