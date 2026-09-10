import { createAdminClient } from '@/lib/supabase/admin'
import { paymentsEnabled } from '@/lib/features'

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i += 1) result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return result === 0
}

async function verifyStripeSignature(payload: string, signatureHeader: string, secret: string) {
  const parts = signatureHeader.split(',')
  const timestamp = parts.find((part) => part.startsWith('t='))?.slice(2)
  const signatures = parts.filter((part) => part.startsWith('v1=')).map((part) => part.slice(3))
  if (!timestamp || signatures.length === 0) return false
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false

  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${payload}`))
  const expected = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
  return signatures.some((signature) => safeEqual(signature, expected))
}

export async function POST(request: Request) {
  if (!paymentsEnabled) return new Response('Not found', { status: 404 })

  const secret = process.env.STRIPE_WEBHOOK_SECRET
  const signature = request.headers.get('stripe-signature')
  const admin = createAdminClient()
  if (!secret || !signature || !admin) return new Response('Webhook yapılandırılmamış', { status: 503 })

  const payload = await request.text()
  if (!(await verifyStripeSignature(payload, signature, secret))) return new Response('Geçersiz imza', { status: 400 })

  const event = JSON.parse(payload) as {
    type: string
    data: { object: { id: string; payment_intent?: string; amount_total?: number; metadata?: { proposal_id?: string } } }
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const proposalId = session.metadata?.proposal_id
    if (proposalId) {
      const { data: proposal } = await admin
        .from('proposals')
        .select('id, freelancer_id, price, jobs!inner(employer_id)')
        .eq('id', proposalId)
        .single()
      const job = Array.isArray(proposal?.jobs) ? proposal.jobs[0] : proposal?.jobs
      if (proposal && job) {
        await admin.from('payments').upsert({
          proposal_id: proposal.id,
          employer_id: job.employer_id,
          freelancer_id: proposal.freelancer_id,
          amount: Number(proposal.price),
          platform_fee: Number(proposal.price) * 0.1,
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id: session.payment_intent ?? null,
          status: 'funded',
        }, { onConflict: 'proposal_id' })
      }
    }
  }

  return Response.json({ received: true })
}
