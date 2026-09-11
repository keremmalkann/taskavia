import 'server-only'

import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'

type RateLimitRule = { scope: string; identifier: string; maxAttempts: number; windowSeconds: number }

async function digest(value: string) {
  const bytes = new TextEncoder().encode(value)
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function consumeAnonymousRateLimit(rule: RateLimitRule) {
  const admin = createAdminClient()
  if (!admin) return { allowed: true, retryAfterSeconds: 0 }

  const requestHeaders = await headers()
  const forwarded = requestHeaders.get('cf-connecting-ip')
    ?? requestHeaders.get('x-real-ip')
    ?? requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? 'unknown'
  const secret = process.env.RATE_LIMIT_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'taskavia-development'
  const bucket = await digest(`${secret}:${rule.scope}:${forwarded}:${rule.identifier}`)
  const { data, error } = await admin.rpc('consume_rate_limit', {
    target_key: `${rule.scope}:${bucket}`,
    max_attempts: rule.maxAttempts,
    window_seconds: rule.windowSeconds,
  })

  if (error) {
    console.error('Rate limit could not be checked', { scope: rule.scope, code: error.code })
    return { allowed: true, retryAfterSeconds: 0 }
  }
  const result = Array.isArray(data) ? data[0] : data
  return {
    allowed: Boolean(result?.allowed),
    retryAfterSeconds: Number(result?.retry_after_seconds ?? 0),
  }
}
