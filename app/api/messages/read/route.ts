import { getMessageReads, withMessageRead } from '@/lib/message-reads'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Oturum gerekli.' }, { status: 401 })

  const body = await request.json().catch(() => null) as { proposalId?: unknown } | null
  const proposalId = typeof body?.proposalId === 'string' ? body.proposalId : ''
  if (!UUID.test(proposalId)) return Response.json({ error: 'Geçersiz konuşma.' }, { status: 400 })

  const { data: proposal } = await supabase
    .from('proposals')
    .select('id')
    .eq('id', proposalId)
    .eq('status', 'accepted')
    .maybeSingle()

  if (!proposal) return Response.json({ error: 'Konuşma bulunamadı.' }, { status: 404 })

  const readAt = new Date().toISOString()
  const messageReads = withMessageRead(getMessageReads(user.user_metadata), proposalId, readAt)
  const { error } = await supabase.auth.updateUser({ data: { message_reads: messageReads } })
  if (error) return Response.json({ error: 'Okunma durumu kaydedilemedi.' }, { status: 500 })

  return Response.json({ ok: true, readAt })
}
