'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/role'
import { getMessageReads, withMessageRead } from '@/lib/message-reads'

export async function markNotificationsRead() {
  const { supabase, user } = await requireUser()
  const now = new Date().toISOString()
  const { data: messages, error: messagesError } = await supabase
    .from('messages')
    .select('proposal_id, created_at')
    .neq('sender_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1000)
  if (messagesError) return { error: 'Bildirimler güncellenemedi. Tekrar dene.' }
  let messageReads = getMessageReads(user.user_metadata)
  for (const message of messages ?? []) {
    messageReads = withMessageRead(messageReads, message.proposal_id, now)
  }
  const { error } = await supabase.auth.updateUser({ data: { notifications_last_seen_at: now, message_reads: messageReads } })
  if (error) return { error: 'Bildirimler güncellenemedi. Tekrar dene.' }
  revalidatePath('/notifications')
  return { success: true }
}
