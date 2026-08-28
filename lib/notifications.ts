import { requireUser, type UserRole } from '@/lib/auth/role'
import { formatCurrency } from '@/lib/marketplace'

export type NotificationItem = {
  id: string
  kind: 'message' | 'proposal' | 'payment'
  title: string
  body: string
  href: string
  createdAt: string
  unread: boolean
}

export type NotificationFeed = { items: NotificationItem[]; unreadCount: number }

type ProposalRow = {
  id: string
  status: string
  price: number | string
  created_at: string
  updated_at: string
  freelancer: { full_name: string | null } | Array<{ full_name: string | null }> | null
  job: { id: string; title: string } | Array<{ id: string; title: string }> | null
}

function one<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function proposalNotification(proposal: ProposalRow, role: UserRole): Omit<NotificationItem, 'unread'> | null {
  const job = one(proposal.job)
  const freelancer = one(proposal.freelancer)
  if (!job) return null

  if (role === 'employer' && proposal.status === 'pending') {
    return {
      id: `proposal-${proposal.id}`,
      kind: 'proposal',
      title: 'Yeni teklif aldın',
      body: `${freelancer?.full_name || 'Bir freelancer'}, “${job.title}” ilanına ${formatCurrency(proposal.price)} teklif verdi.`,
      href: `/jobs/${job.id}`,
      createdAt: proposal.created_at,
    }
  }

  if (role === 'freelancer' && proposal.status === 'accepted') {
    return {
      id: `proposal-${proposal.id}-accepted`,
      kind: 'proposal',
      title: 'Teklifin kabul edildi',
      body: `“${job.title}” projesi için teklifin kabul edildi. Artık işverenle mesajlaşabilirsin.`,
      href: `/messages/${proposal.id}`,
      createdAt: proposal.updated_at,
    }
  }

  if (role === 'freelancer' && proposal.status === 'rejected') {
    return {
      id: `proposal-${proposal.id}-rejected`,
      kind: 'proposal',
      title: 'Teklif durumu güncellendi',
      body: `“${job.title}” projesi için başka bir freelancer seçildi.`,
      href: `/jobs/${job.id}`,
      createdAt: proposal.updated_at,
    }
  }

  return null
}

export async function getNotifications(limit = 20): Promise<NotificationFeed> {
  const { supabase, user, role } = await requireUser()
  const proposalsQuery = supabase
    .from('proposals')
    .select('id, status, price, created_at, updated_at, freelancer:profiles!proposals_freelancer_id_fkey(full_name), job:jobs!inner(id, title)')
    .order('updated_at', { ascending: false })
    .limit(20)

  if (role === 'freelancer') proposalsQuery.eq('freelancer_id', user.id)

  const [proposalsResult, messagesResult, paymentsResult] = await Promise.all([
    proposalsQuery,
    supabase
      .from('messages')
      .select('id, body, created_at, sender_id, proposal_id, sender:profiles!messages_sender_id_fkey(full_name), proposal:proposals!inner(id, job:jobs!inner(id, title))')
      .neq('sender_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('payments')
      .select('id, amount, status, created_at, updated_at, proposal:proposals!inner(id, job:jobs!inner(id, title))')
      .eq(role === 'employer' ? 'employer_id' : 'freelancer_id', user.id)
      .in('status', ['funded', 'released'])
      .order('updated_at', { ascending: false })
      .limit(10),
  ])

  const items: Array<Omit<NotificationItem, 'unread'>> = []

  for (const proposal of proposalsResult.data ?? []) {
    const item = proposalNotification(proposal as unknown as ProposalRow, role)
    if (item) items.push(item)
  }

  for (const message of messagesResult.data ?? []) {
    const proposal = one(message.proposal)
    const job = one(proposal?.job)
    const sender = one(message.sender)
    if (!proposal || !job) continue
    items.push({
      id: `message-${message.id}`,
      kind: 'message',
      title: `${sender?.full_name || 'Bir kullanıcı'} sana mesaj gönderdi`,
      body: `${job.title}: ${message.body}`,
      href: `/messages/${proposal.id}`,
      createdAt: message.created_at,
    })
  }

  for (const payment of paymentsResult.data ?? []) {
    const proposal = one(payment.proposal)
    const job = one(proposal?.job)
    if (!proposal || !job) continue
    const released = payment.status === 'released'
    items.push({
      id: `payment-${payment.id}-${payment.status}`,
      kind: 'payment',
      title: released ? 'Ödeme tamamlandı' : 'Ödeme güvenceye alındı',
      body: released
        ? role === 'freelancer' ? `“${job.title}” için ${formatCurrency(payment.amount)} tutarındaki ödeme hesabına aktarıldı.` : `“${job.title}” için ödeme freelancer’a aktarıldı.`
        : `“${job.title}” için ${formatCurrency(payment.amount)} güvenli ödeme sistemine alındı.`,
      href: `/messages/${proposal.id}`,
      createdAt: payment.updated_at || payment.created_at,
    })
  }

  const lastSeen = String(user.user_metadata.notifications_last_seen_at ?? '')
  const lastSeenTime = lastSeen ? new Date(lastSeen).getTime() : 0
  const sorted = items
    .filter((item) => item.createdAt)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const unreadCount = sorted.filter((item) => new Date(item.createdAt).getTime() > lastSeenTime).length

  return {
    items: sorted.slice(0, limit).map((item) => ({ ...item, unread: new Date(item.createdAt).getTime() > lastSeenTime })),
    unreadCount,
  }
}

export function formatNotificationTime(value: string) {
  const date = new Date(value)
  const difference = Date.now() - date.getTime()
  const minutes = Math.max(0, Math.floor(difference / 60_000))
  if (minutes < 1) return 'Şimdi'
  if (minutes < 60) return `${minutes} dk önce`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} sa önce`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} gün önce`
  return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', timeZone: 'Europe/Istanbul' }).format(date)
}
