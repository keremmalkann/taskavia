import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/role'
import { createAdminClient } from '@/lib/supabase/admin'

function adminEmails() {
  return String(process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLocaleLowerCase('tr-TR'))
    .filter(Boolean)
}

export function isAdminEmail(email: string | null | undefined) {
  return Boolean(email && adminEmails().includes(email.toLocaleLowerCase('tr-TR')))
}

export async function requireAdmin() {
  const current = await requireUser()
  if (!isAdminEmail(current.user.email)) redirect(current.role === 'employer' ? '/employer' : '/freelancer')

  const admin = createAdminClient()
  if (!admin) redirect('/settings?error=' + encodeURIComponent('Yönetim servisi yapılandırılamadı.'))

  return { ...current, admin }
}
