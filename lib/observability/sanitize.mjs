const SENSITIVE_KEY = /(authorization|cookie|password|secret|token|api[-_]?key|service[-_]?role|session|email|phone)/i
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi
const BEARER = /\bBearer\s+[A-Za-z0-9._~+\/-]+=*/gi
const JWT = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g

export function sanitizeText(value, maxLength = 1_000) {
  const clean = String(value)
    .replace(BEARER, 'Bearer [redacted]')
    .replace(JWT, '[redacted-jwt]')
    .replace(EMAIL, '[redacted-email]')
    .replace(/([?&](?:token|code|key|secret|password)=)[^&\s]+/gi, '$1[redacted]')

  return clean.length > maxLength ? `${clean.slice(0, maxLength)}…` : clean
}

export function sanitizeValue(value, depth = 0) {
  if (depth > 4) return '[max-depth]'
  if (value == null || typeof value === 'boolean' || typeof value === 'number') return value
  if (typeof value === 'string') return sanitizeText(value)
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitizeValue(item, depth + 1))
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).slice(0, 50).map(([key, item]) => [
      key,
      SENSITIVE_KEY.test(key) ? '[redacted]' : sanitizeValue(item, depth + 1),
    ]))
  }
  return sanitizeText(value)
}

export function publicErrorReference(digest) {
  const safeDigest = typeof digest === 'string' ? digest.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) : ''
  return safeDigest ? `TVA-ERR-${safeDigest}` : 'TVA-ERR-CLIENT'
}
