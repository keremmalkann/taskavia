'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/role'

export async function markNotificationsRead() {
  const { supabase } = await requireUser()
  await supabase.auth.updateUser({ data: { notifications_last_seen_at: new Date().toISOString() } })
  revalidatePath('/notifications')
  redirect('/notifications?message=' + encodeURIComponent('Bildirimlerin okundu olarak işaretlendi.'))
}
