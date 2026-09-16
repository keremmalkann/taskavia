import 'server-only'

import { sanitizeText, sanitizeValue } from './sanitize.mjs'

export const ErrorCodes = {
  unhandledServer: 'TVA-SYS-001',
  unhandledClient: 'TVA-UI-001',
  invalidRequest: 'TVA-API-001',
  unauthorized: 'TVA-AUTH-001',
  conversationNotFound: 'TVA-MSG-001',
  messageReadFailed: 'TVA-MSG-002',
  messageQueryFailed: 'TVA-MSG-003',
  notificationQueryFailed: 'TVA-NTF-001',
  emailDeliveryFailed: 'TVA-EML-001',
  rateLimitCheckFailed: 'TVA-SEC-001',
  stripeNotConfigured: 'TVA-PAY-001',
  stripeSignatureInvalid: 'TVA-PAY-002',
  stripePayloadInvalid: 'TVA-PAY-003',
  stripeWriteFailed: 'TVA-PAY-004',
} as const

type Severity = 'warning' | 'error' | 'fatal'

type ReportOptions = {
  code: string
  event: string
  severity?: Severity
  context?: Record<string, unknown>
}

function errorDetails(error: unknown) {
  if (!(error instanceof Error)) return { name: 'UnknownError', message: sanitizeText(error) }
  const digest = 'digest' in error && typeof error.digest === 'string' ? error.digest : undefined
  return {
    name: sanitizeText(error.name, 120),
    message: sanitizeText(error.message),
    digest: digest ? sanitizeText(digest, 120) : undefined,
    stack: error.stack ? sanitizeText(error.stack.split('\n').slice(0, 12).join('\n'), 4_000) : undefined,
  }
}

async function deliver(event: Record<string, unknown>) {
  const endpoint = process.env.ERROR_REPORTING_WEBHOOK_URL?.trim()
  if (!endpoint) return

  try {
    const url = new URL(endpoint)
    if (url.protocol !== 'https:' && process.env.NODE_ENV === 'production') return
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.ERROR_REPORTING_WEBHOOK_TOKEN
          ? { Authorization: `Bearer ${process.env.ERROR_REPORTING_WEBHOOK_TOKEN}` }
          : {}),
      },
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(2_000),
    })
  } catch {
    console.warn(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'warning',
      event: 'observability.delivery_failed',
      code: 'TVA-OBS-001',
    }))
  }
}

export async function reportServerError(error: unknown, options: ReportOptions) {
  const eventId = crypto.randomUUID()
  const event = {
    timestamp: new Date().toISOString(),
    level: options.severity ?? 'error',
    event: sanitizeText(options.event, 160),
    code: options.code,
    eventId,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'unknown',
    release: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.CF_PAGES_COMMIT_SHA ?? 'local',
    error: errorDetails(error),
    context: sanitizeValue(options.context ?? {}),
  }

  const output = JSON.stringify(event)
  if (options.severity === 'warning') console.warn(output)
  else console.error(output)
  await deliver(event)
  return eventId
}
