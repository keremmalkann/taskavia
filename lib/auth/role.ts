import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export type UserRole = 'freelancer' | 'employer'

export function dashboardPathForRole(role: unknown) {
  return role === 'employer' ? '/employer' : '/freelancer'
}

export async function requireRole(expectedRole: UserRole) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?error=' + encodeURIComponent('Bu sayfayı görmek için giriş yapmalısın.'))
  }

  const role: UserRole = user.user_metadata.role === 'employer' ? 'employer' : 'freelancer'

  if (role !== expectedRole) {
    redirect(dashboardPathForRole(role))
  }

  return {
    user,
    role,
    fullName: String(user.user_metadata.full_name ?? user.email?.split('@')[0] ?? 'İşlik üyesi'),
  }
}
