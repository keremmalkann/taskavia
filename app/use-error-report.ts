'use client'

import { useEffect, useState } from 'react'
import { publicErrorReference } from '@/lib/observability/sanitize.mjs'

export function useErrorReport(error: Error & { digest?: string }) {
  const [reference, setReference] = useState(() => publicErrorReference(error.digest))

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: error.name,
        message: error.message,
        digest: error.digest,
        path: window.location.pathname,
      }),
      signal: controller.signal,
    })
      .then((response) => response.ok ? response.json() : null)
      .then((result) => {
        if (result?.eventId) setReference(`${result.code}-${String(result.eventId).slice(0, 8).toUpperCase()}`)
      })
      .catch(() => undefined)

    return () => controller.abort()
  }, [error])

  return reference
}
