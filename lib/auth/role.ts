import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export type UserRole = 'freelancer' | 'employer'

export function dashboardPathForRole(role: unknown) {
  return role === 'employer' ? '/employer' : '/freelancer'
}

export async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?error=' + encodeURIComponent('Bu sayfayı görmek için giriş yapmalısın.'))
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .maybeSingle()

  const role: UserRole = profile
    ? (profile.role === 'employer' ? 'employer' : 'freelancer')
    : (user.user_metadata.role === 'employer' ? 'employer' : 'freelancer')

  return {
    supabase,
    user,
    role,
    fullName: String(profile?.full_name ?? user.user_metadata.full_name ?? user.email?.split('@')[0] ?? 'Taskavia üyesi'),
  }
}

export async function requireRole(expectedRole: UserRole) {
  const current = await requireUser()

  if (current.role !== expectedRole) {
    redirect(dashboardPathForRole(current.role))
  }

  return current
}
