'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { markNotificationsRead } from '@/lib/actions/notifications'

type NotificationItem = { id: string; kind: 'message' | 'proposal' | 'payment'; title: string; body: string; href: string; createdAt: string; unread: boolean }
type NotificationFeed = { items: NotificationItem[]; unreadCount: number }

function notificationTime(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000))
  if (minutes < 1) return 'Şimdi'
  if (minutes < 60) return `${minutes} dk önce`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} sa önce`
  return `${Math.floor(hours / 24)} gün önce`
}

export function NotificationMenu() {
  const [feed, setFeed] = useState<NotificationFeed>({ items: [], unreadCount: 0 })
  const [loading, setLoading] = useState(false)

  const loadNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/notifications', { cache: 'no-store' })
      if (response.ok) setFeed(await response.json() as NotificationFeed)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const initial = window.setTimeout(() => void loadNotifications(), 0)
    const interval = window.setInterval(() => void loadNotifications(), 30_000)
    const onFocus = () => void loadNotifications()
    window.addEventListener('focus', onFocus)
    window.addEventListener('islik:messages-read', onFocus)
    return () => {
      window.clearTimeout(initial)
      window.clearInterval(interval)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('islik:messages-read', onFocus)
    }
  }, [loadNotifications])

  return <details className="notification-menu" onToggle={(event) => { if (event.currentTarget.open) void loadNotifications() }}>
    <summary aria-label="Bildirimleri aç"><span aria-hidden="true">🔔</span>{feed.unreadCount > 0 && <strong>{Math.min(feed.unreadCount, 9)}{feed.unreadCount > 9 ? '+' : ''}</strong>}</summary>
    <div className="notification-popover">
      <div className="notification-popover-head"><div><span>BİLDİRİMLER</span><h2>Son gelişmeler</h2></div>{feed.unreadCount > 0 && <form action={markNotificationsRead}><button type="submit">Tümünü okundu işaretle</button></form>}</div>
      <div className="notification-popover-list">
        {loading ? <p>Bildirimler yükleniyor…</p> : feed.items.length > 0 ? feed.items.map((item) => <Link href={item.href} className={item.unread ? 'unread' : ''} key={item.id}><i className={`notification-kind ${item.kind}`} aria-hidden="true">{item.kind === 'message' ? '✉' : item.kind === 'payment' ? '₺' : '↗'}</i><span><strong>{item.title}</strong><small>{item.body}</small><time>{notificationTime(item.createdAt)}</time></span></Link>) : <p>Henüz bildirimin yok.</p>}
      </div>
      <Link className="notification-all-link" href="/notifications">Tüm bildirimleri gör →</Link>
    </div>
  </details>
}
