import { getMessageReads, isMessageUnread } from '@/lib/message-reads'
import { ErrorCodes, reportServerError } from '@/lib/observability/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type IncomingMessage = { proposal_id: string; created_at: string }

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ unreadCount: 0, code: ErrorCodes.unauthorized }, { status: 401 })

  const { data, error } = await supabase
    .from('messages')
    .select('proposal_id, created_at')
    .neq('sender_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1000)

  if (error) {
    const eventId = await reportServerError(error, {
      code: ErrorCodes.messageQueryFailed,
      event: 'message.unread_query_failed',
      context: { userId: user.id },
    })
    return Response.json({ unreadCount: 0, code: ErrorCodes.messageQueryFailed, eventId }, { status: 500 })
  }

  const reads = getMessageReads(user.user_metadata)
  const unreadCount = ((data ?? []) as IncomingMessage[])
    .filter((message) => isMessageUnread(reads, message.proposal_id, message.created_at))
    .length

  return Response.json({ unreadCount })
}
