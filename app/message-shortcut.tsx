'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

export const MESSAGE_READ_EVENT = 'islik:messages-read'

export function MessageShortcut() {
  const [unreadCount, setUnreadCount] = useState(0)

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/messages/unread', { cache: 'no-store' })
      if (!response.ok) return
      const feed = await response.json() as { unreadCount?: number }
      setUnreadCount(Math.max(0, Number(feed.unreadCount) || 0))
    } catch {
      // Bağlantı geri geldiğinde odaklanma veya zamanlayıcı tekrar dener.
    }
  }, [])

  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0)
    const interval = window.setInterval(() => void refresh(), 30_000)
    const onFocus = () => void refresh()
    window.addEventListener('focus', onFocus)
    window.addEventListener(MESSAGE_READ_EVENT, onFocus)
    return () => {
      window.clearTimeout(initial)
      window.clearInterval(interval)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener(MESSAGE_READ_EVENT, onFocus)
    }
  }, [refresh])

  return <Link className="message-shortcut" href="/messages" aria-label={unreadCount > 0 ? `${unreadCount} okunmamış mesaj. Mesajlara git` : 'Mesajlara git'} title="Mesajlar">
    <span aria-hidden="true">✉</span>
    {unreadCount > 0 && <strong>{Math.min(unreadCount, 99)}{unreadCount > 99 ? '+' : ''}</strong>}
  </Link>
}
