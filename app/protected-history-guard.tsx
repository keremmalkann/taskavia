'use client'

import { useEffect } from 'react'

export function ProtectedHistoryGuard() {
  useEffect(() => {
    let reloading = false

    const revalidate = () => {
      if (reloading) return
      reloading = true
      window.location.reload()
    }

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) revalidate()
    }

    window.addEventListener('pageshow', handlePageShow)

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    if (navigation?.type === 'back_forward') revalidate()

    return () => window.removeEventListener('pageshow', handlePageShow)
  }, [])

  return null
}
