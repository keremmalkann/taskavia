'use client'

import { useEffect } from 'react'

const sessionEndedMessage = 'Geri veya ileri gezinme algılandı. Güvenliğin için oturumun kapatıldı.'

export function ProtectedHistoryGuard() {
  useEffect(() => {
    let handled = false

    const endSession = async () => {
      if (handled) return
      handled = true
      document.body.style.pointerEvents = 'none'

      try {
        await fetch('/auth/signout', {
          method: 'POST',
          cache: 'no-store',
          credentials: 'same-origin',
          keepalive: true,
          headers: { 'X-Requested-With': 'history-navigation' },
        })
      } finally {
        window.location.replace(`/login?message=${encodeURIComponent(sessionEndedMessage)}`)
      }
    }

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) void endSession()
    }

    const handlePopState = (event: PopStateEvent) => {
      event.stopImmediatePropagation()
      void endSession()
    }

    window.addEventListener('pageshow', handlePageShow)
    window.addEventListener('popstate', handlePopState, true)

    const currentState = typeof window.history.state === 'object' && window.history.state
      ? window.history.state
      : {}

    if (!currentState.__islikHistoryGuard) {
      window.history.replaceState(
        { ...currentState, __islikProtectedPage: true },
        '',
        window.location.href,
      )
      window.history.pushState(
        { ...currentState, __islikHistoryGuard: true },
        '',
        window.location.href,
      )
    }

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    if (navigation?.type === 'back_forward') void endSession()

    return () => {
      window.removeEventListener('pageshow', handlePageShow)
      window.removeEventListener('popstate', handlePopState, true)
    }
  }, [])

  return null
}
