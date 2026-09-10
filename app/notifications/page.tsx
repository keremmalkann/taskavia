import type { Metadata } from 'next'
import Link from 'next/link'
import { Feedback, MarketplaceShell } from '@/app/marketplace-shell'
import { MarkNotificationsRead } from '@/app/mark-notifications-read'
import { requireUser } from '@/lib/auth/role'
import { formatNotificationTime, getNotifications } from '@/lib/notifications'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Bildirimler — Taskavia', description: 'Mesaj, teklif ve proje bildirimlerini takip et.' }

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const params = await searchParams
  const { role, fullName } = await requireUser()
  const feed = await getNotifications(50).catch(() => ({ items: [], unreadCount: 0 }))

  return <MarketplaceShell name={fullName} role={role} active="notifications">
    <div className="marketplace-page-head"><div><p>BİLDİRİM MERKEZİ</p><h1>Gelişmeleri kaçırma.</h1><span>Mesajlar, teklifler ve proje hareketleri burada tek akışta toplanır.</span></div><MarkNotificationsRead unread={feed.unreadCount > 0} className="notification-read-all" /></div>
    <Feedback {...params} />
    <section className="notifications-page-list">
      {feed.items.length > 0 ? feed.items.map((item) => <Link href={item.href} className={item.unread ? 'unread' : ''} key={item.id}><i className={`notification-kind ${item.kind}`} aria-hidden="true">{item.kind === 'message' ? '✉' : item.kind === 'payment' ? '₺' : '↗'}</i><div><span>{item.kind === 'message' ? 'MESAJ' : item.kind === 'payment' ? 'ÖDEME' : 'TEKLİF'}</span><h2>{item.title}</h2><p>{item.body}</p><time>{formatNotificationTime(item.createdAt)}</time></div><strong aria-hidden="true">→</strong></Link>) : <div className="marketplace-empty"><strong>Her şey sakin</strong><p>Yeni mesaj, teklif veya proje hareketi olduğunda burada göreceksin.</p></div>}
    </section>
  </MarketplaceShell>
}
