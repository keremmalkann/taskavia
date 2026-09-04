import Link from 'next/link'
import { DashboardShell } from '@/app/dashboard-shell'
import { AuthFeedbackUrlCleanup } from '@/app/auth-feedback-url-cleanup'
import type { UserRole } from '@/lib/auth/role'

export function MarketplaceShell({ name, role, active, children }: { name: string; role: UserRole; active: string; children: React.ReactNode }) {
  const freelancerNav = [
    { label: 'Genel bakış', icon: '◫', href: '/freelancer', active: active === 'dashboard' },
    { label: 'İşleri keşfet', icon: '⌕', href: '/jobs', active: active === 'jobs' },
    { label: 'Favorilerim', icon: '☆', href: '/freelancer/favorites', active: active === 'favorites' },
    { label: 'Profilim', icon: '♙', href: '/profile', active: active === 'profile' },
    { label: 'Ayarlar', icon: '⚙', href: '/settings', active: active === 'settings' },
  ]
  const employerNav = [
    { label: 'Genel bakış', icon: '◫', href: '/employer', active: active === 'dashboard' },
    { label: 'Yeni ilan', icon: '＋', href: '/employer/jobs/new', active: active === 'new-job' },
    { label: 'Profilim', icon: '♙', href: '/profile', active: active === 'profile' },
    { label: 'Ayarlar', icon: '⚙', href: '/settings', active: active === 'settings' },
  ]
  return (
    <DashboardShell
      name={name}
      roleLabel={role === 'employer' ? 'İşveren hesabı' : 'Freelancer hesabı'}
      navItems={role === 'employer' ? employerNav : freelancerNav}
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
  return <div className="marketplace-empty"><strong>Veriler şu anda yüklenemedi</strong><p>Bağlantı veya erişim kontrolü sırasında bir sorun oluştu. Sayfayı yenileyip tekrar deneyebilirsin.</p></div>
}
