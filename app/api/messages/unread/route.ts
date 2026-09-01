import { getMessageReads, isMessageUnread } from '@/lib/message-reads'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type IncomingMessage = { proposal_id: string; created_at: string }

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ unreadCount: 0 }, { status: 401 })

  const { data, error } = await supabase
    .from('messages')
    .select('proposal_id, created_at')
    .neq('sender_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1000)

  if (error) return Response.json({ unreadCount: 0 }, { status: 500 })

  const reads = getMessageReads(user.user_metadata)
  const unreadCount = ((data ?? []) as IncomingMessage[])
    .filter((message) => isMessageUnread(reads, message.proposal_id, message.created_at))
    .length

  return Response.json({ unreadCount })
}
