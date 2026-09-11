import { getMessageReads, withMessageRead } from '@/lib/message-reads'
import { apiError } from '@/lib/http/api-error'
import { ErrorCodes, reportServerError } from '@/lib/observability/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError(ErrorCodes.unauthorized, 'Oturum gerekli.', 401)

  const body = await request.json().catch(() => null) as { proposalId?: unknown } | null
  const proposalId = typeof body?.proposalId === 'string' ? body.proposalId : ''
  if (!UUID.test(proposalId)) return apiError(ErrorCodes.invalidRequest, 'Geçersiz konuşma.', 400)

  const { data: proposal } = await supabase
    .from('proposals')
    .select('id')
    .eq('id', proposalId)
    .eq('status', 'accepted')
    .maybeSingle()

  if (!proposal) return apiError(ErrorCodes.conversationNotFound, 'Konuşma bulunamadı.', 404)

  const readAt = new Date().toISOString()
  const messageReads = withMessageRead(getMessageReads(user.user_metadata), proposalId, readAt)
  const { error } = await supabase.auth.updateUser({ data: { message_reads: messageReads } })
  if (error) {
    const eventId = await reportServerError(error, {
      code: ErrorCodes.messageReadFailed,
      event: 'message.read_state_write_failed',
      context: { proposalId, userId: user.id },
    })
    return Response.json({ error: 'Okunma durumu kaydedilemedi.', code: ErrorCodes.messageReadFailed, eventId }, { status: 500 })
  }

  return Response.json({ ok: true, readAt })
}
