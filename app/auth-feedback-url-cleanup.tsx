'use client'

import { useEffect } from 'react'

export function AuthFeedbackUrlCleanup() {
  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.delete('error')
    url.searchParams.delete('message')

    const cleanUrl = `${url.pathname}${url.search}${url.hash}`
    window.history.replaceState(window.history.state, '', cleanUrl)
  }, [])

  return null
}
