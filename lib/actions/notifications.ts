'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/role'
import { getMessageReads, withMessageRead } from '@/lib/message-reads'

export async function markNotificationsRead() {
  const { supabase, user } = await requireUser()
  const now = new Date().toISOString()
  const { data: messages } = await supabase
    .from('messages')
    .select('proposal_id, created_at')
    .neq('sender_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1000)
  let messageReads = getMessageReads(user.user_metadata)
  for (const message of messages ?? []) {
    if (!messageReads[message.proposal_id]) messageReads = withMessageRead(messageReads, message.proposal_id, now)
  }
  await supabase.auth.updateUser({ data: { notifications_last_seen_at: now, message_reads: messageReads } })
  revalidatePath('/notifications')
  redirect('/notifications?message=' + encodeURIComponent('Bildirimlerin okundu olarak işaretlendi.'))
}
