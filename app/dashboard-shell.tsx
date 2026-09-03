import Link from 'next/link'
import { signOut } from '@/lib/actions/auth'
import { MessageShortcut } from '@/app/message-shortcut'
import { NotificationMenu } from '@/app/notification-menu'
import { ProtectedHistoryGuard } from '@/app/protected-history-guard'

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
      <ProtectedHistoryGuard />
      <aside className="dashboard-sidebar">
        <Link className="brand dashboard-brand" href="/"><span className="brand-mark">t</span><span>taskavia</span></Link>
        <nav className="dashboard-nav" aria-label="Panel menüsü">
          <p>MENÜ</p>
          {navItems.map((item) => (
            <Link className={item.active ? 'active' : ''} href={item.href ?? '#'} key={item.label} aria-current={item.active ? 'page' : undefined}>
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
          <div className="dashboard-top-actions">
            <MessageShortcut />
            <NotificationMenu />
            {action}
          </div>
        </header>
        {children}
      </section>
      <nav className="mobile-dashboard-nav" aria-label="Mobil panel menüsü">
        {navItems.map((item) => <Link className={item.active ? 'active' : ''} href={item.href ?? '#'} key={item.label} aria-current={item.active ? 'page' : undefined}>
          <span aria-hidden="true">{item.icon}</span>
          <strong>{item.label}</strong>
          {item.badge && <em>{item.badge}</em>}
        </Link>)}
      </nav>
    </main>
  )
}

export function StatCard({ label, value, note, tone = 'paper', href }: { label: string; value: string; note: string; tone?: 'paper' | 'lime' | 'dark' | 'blue'; href?: string }) {
  const content = <><span>{label}</span><strong>{value}</strong><small>{note}</small>{href && <b className="dashboard-stat-arrow" aria-hidden="true">→</b>}</>
  return href
    ? <Link className={`dashboard-stat dashboard-stat-${tone} dashboard-stat-link`} href={href} aria-label={`${label}: ${value}. Detayları görüntüle`}>{content}</Link>
    : <article className={`dashboard-stat dashboard-stat-${tone}`}>{content}</article>
}

export function DashboardDate() {
  const now = new Date()
  const month = new Intl.DateTimeFormat('tr-TR', { month: 'long', timeZone: 'Europe/Istanbul' }).format(now).toLocaleUpperCase('tr-TR')
  const day = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', timeZone: 'Europe/Istanbul' }).format(now)
  const weekday = new Intl.DateTimeFormat('tr-TR', { weekday: 'long', timeZone: 'Europe/Istanbul' }).format(now)

  return <div className="dashboard-date"><small>{month}</small><strong>{day}</strong><span>{weekday}</span></div>
}
