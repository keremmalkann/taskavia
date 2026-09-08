'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { markNotificationsRead } from '@/lib/actions/notifications'
import './notification-feedback.css'

export function MarkNotificationsRead({ unread, className }: { unread: boolean; className?: string }) {
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), notice.error ? 6000 : 3500)
    return () => window.clearTimeout(timer)
  }, [notice])
  return <>
    {unread && <button className={className} type="button" disabled={pending} onClick={() => {
      startTransition(async () => {
        try {
          const result = await markNotificationsRead()
          if (result.error) setNotice({ text: result.error, error: true })
          else {
            setNotice({ text: 'Bildirimler okundu olarak işaretlendi.', error: false })
            window.dispatchEvent(new Event('islik:messages-read'))
            router.refresh()
          }
        } catch { setNotice({ text: 'Bağlantı kurulamadı. Tekrar dene.', error: true }) }
      })
    }}>{pending ? 'İşaretleniyor…' : 'Tümünü okundu işaretle'}</button>}
    {notice && <div className="notification-feedback" role={notice.error ? 'alert' : 'status'}><span aria-hidden="true">{notice.error ? '!' : '✓'}</span>{notice.text}</div>}
  </>
}
