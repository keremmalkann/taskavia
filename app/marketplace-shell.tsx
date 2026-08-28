import Link from 'next/link'
import { DashboardShell } from '@/app/dashboard-shell'
import { AuthFeedbackUrlCleanup } from '@/app/auth-feedback-url-cleanup'
import type { UserRole } from '@/lib/auth/role'
import { getNotifications, type NotificationFeed } from '@/lib/notifications'

export async function MarketplaceShell({ name, role, active, children, notificationFeed }: { name: string; role: UserRole; active: string; children: React.ReactNode; notificationFeed?: NotificationFeed }) {
  const freelancerNav = [
    { label: 'Genel bakış', icon: '◫', href: '/freelancer', active: active === 'dashboard' },
    { label: 'İşleri keşfet', icon: '⌕', href: '/jobs', active: active === 'jobs' },
    { label: 'Profilim', icon: '♙', href: '/profile', active: active === 'profile' },
    { label: 'Ayarlar', icon: '⚙', href: '/settings', active: active === 'settings' },
  ]
  const employerNav = [
    { label: 'Genel bakış', icon: '◫', href: '/employer', active: active === 'dashboard' },
    { label: 'Yeni ilan', icon: '＋', href: '/employer/jobs/new', active: active === 'new-job' },
    { label: 'Profilim', icon: '♙', href: '/profile', active: active === 'profile' },
    { label: 'Ayarlar', icon: '⚙', href: '/settings', active: active === 'settings' },
  ]
  const notifications = notificationFeed ?? await getNotifications(5)

  return (
    <DashboardShell
      name={name}
      roleLabel={role === 'employer' ? 'İşveren hesabı' : 'Freelancer hesabı'}
      navItems={role === 'employer' ? employerNav : freelancerNav}
      notifications={notifications}
      action={role === 'employer'
        ? <Link className="dashboard-primary marketplace-action-link" href="/employer/jobs/new">Yeni proje yayınla <span>＋</span></Link>
        : <Link className="dashboard-primary marketplace-action-link" href="/jobs">İşleri keşfet <span>→</span></Link>}
    >
      {children}
    </DashboardShell>
  )
}

export function Feedback({ error, message }: { error?: string; message?: string }) {
  return <>{message && <p className="success-message" role="status">{message}</p>}{error && <p className="error-message" role="alert">{error}</p>}{(message || error) && <AuthFeedbackUrlCleanup />}</>
}

export function SetupNotice() {
  return <div className="marketplace-empty"><strong>Veritabanı kurulumu gerekiyor</strong><p>Supabase migration dosyasını SQL Editor üzerinden çalıştırdığında bu alan gerçek verilerle dolacak.</p></div>
}
