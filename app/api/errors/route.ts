import { apiError } from '@/lib/http/api-error'
import { ErrorCodes, reportServerError } from '@/lib/observability/server'
import { consumeAnonymousRateLimit } from '@/lib/security/rate-limit'

export const dynamic = 'force-dynamic'

type ClientErrorBody = {
  name?: unknown
  message?: unknown
  digest?: unknown
  path?: unknown
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin')
  if (origin && origin !== new URL(request.url).origin) {
    return apiError(ErrorCodes.invalidRequest, 'Geçersiz istek.', 403)
  }

  const rawBody = await request.text()
  if (rawBody.length > 8_192) return apiError(ErrorCodes.invalidRequest, 'İstek çok büyük.', 413)
  const body = await Promise.resolve().then(() => JSON.parse(rawBody)).catch(() => null) as ClientErrorBody | null
  if (!body || typeof body.message !== 'string') {
    return apiError(ErrorCodes.invalidRequest, 'Geçersiz hata bildirimi.', 400)
  }

  const limit = await consumeAnonymousRateLimit({
    scope: 'client-error-report',
    identifier: typeof body.digest === 'string' ? body.digest.slice(0, 80) : 'unknown',
    maxAttempts: 20,
    windowSeconds: 60,
  })
  if (!limit.allowed) {
    return apiError(ErrorCodes.rateLimitCheckFailed, 'Çok fazla istek.', 429, {
      'Retry-After': String(limit.retryAfterSeconds),
    })
  }

  const eventId = await reportServerError(new Error(body.message.slice(0, 1_000)), {
    code: ErrorCodes.unhandledClient,
    event: 'browser.unhandled_render_error',
    context: {
      name: typeof body.name === 'string' ? body.name.slice(0, 120) : undefined,
      digest: typeof body.digest === 'string' ? body.digest.slice(0, 120) : undefined,
      path: typeof body.path === 'string' ? body.path.split('?')[0].slice(0, 300) : undefined,
    },
  })

  return Response.json({ accepted: true, code: ErrorCodes.unhandledClient, eventId }, { status: 202 })
}
