'use client'

import { useEffect } from 'react'

const sessionEndedMessage = 'Güvenliğin için önceki oturum kapatıldı. Lütfen yeniden giriş yap.'

export function LoginHistoryGuard() {
  useEffect(() => {
    let handled = false

    const endSession = async () => {
      if (handled) return
      handled = true

      try {
        await fetch('/auth/signout', {
          method: 'POST',
          cache: 'no-store',
          credentials: 'same-origin',
          headers: { 'X-Requested-With': 'history-navigation' },
        })
      } finally {
        window.location.replace(`/login?message=${encodeURIComponent(sessionEndedMessage)}`)
      }
    }

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) void endSession()
    }

    window.addEventListener('pageshow', handlePageShow)

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    if (navigation?.type === 'back_forward') void endSession()

    return () => window.removeEventListener('pageshow', handlePageShow)
  }, [])

  return null
}
