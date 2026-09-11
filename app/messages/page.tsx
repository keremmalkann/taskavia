import type { Metadata } from 'next'
import Link from 'next/link'
import { Feedback, MarketplaceShell, SetupNotice } from '@/app/marketplace-shell'
import { requireUser } from '@/lib/auth/role'
import { getMessageReads, isMessageUnread } from '@/lib/message-reads'
import { formatNotificationTime } from '@/lib/notifications'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Mesajlar — Taskavia', description: 'Aktif projelerindeki konuşmalara ulaş.' }

type Profile = { full_name: string | null; company_name?: string | null }
type Job = { id: string; title: string; employer: Profile | Profile[] | null }
type Conversation = { id: string; updated_at: string; freelancer: Profile | Profile[] | null; job: Job | Job[] | null }
type RecentMessage = { id: string; proposal_id: string; sender_id: string; body: string; created_at: string }

function one<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const feedback = await searchParams
  const { supabase, user, role, fullName } = await requireUser()
  const { data, error } = await supabase
    .from('proposals')
    .select('id, updated_at, freelancer:profiles!proposals_freelancer_id_fkey(full_name), job:jobs!inner(id, title, employer:profiles!jobs_employer_id_fkey(full_name, company_name))')
    .eq('status', 'accepted')
    .order('updated_at', { ascending: false })

  const conversations = (data ?? []) as unknown as Conversation[]
  const proposalIds = conversations.map((conversation) => conversation.id)
  let recentMessages: RecentMessage[] = []

  if (proposalIds.length > 0) {
    const { data: messageData } = await supabase
      .from('messages')
      .select('id, proposal_id, sender_id, body, created_at')
      .in('proposal_id', proposalIds)
      .order('created_at', { ascending: false })
    recentMessages = (messageData ?? []) as RecentMessage[]
  }

  const latestByProposal = new Map<string, RecentMessage>()
  const unreadByProposal = new Map<string, number>()
  const messageReads = getMessageReads(user.user_metadata)
  for (const message of recentMessages) {
    if (!latestByProposal.has(message.proposal_id)) latestByProposal.set(message.proposal_id, message)
    if (message.sender_id !== user.id && isMessageUnread(messageReads, message.proposal_id, message.created_at)) {
      unreadByProposal.set(message.proposal_id, (unreadByProposal.get(message.proposal_id) ?? 0) + 1)
    }
  }

  return <MarketplaceShell name={fullName} role={role} active="messages">
    <Feedback {...feedback} />
    <div className="workspace-head messages-head"><div><p>MESAJLAR</p><h1>Konuşmaların</h1><span>Aktif projelerindeki işveren ve freelancer görüşmelerine buradan ulaş.</span></div></div>
    {error ? <SetupNotice /> : conversations.length > 0 ? <section className="conversation-list" aria-label="Konuşmalar">
      {conversations.map((conversation) => {
        const job = one(conversation.job)
        const freelancer = one(conversation.freelancer)
        const employer = one(job?.employer)
        const counterpart = role === 'employer'
          ? freelancer?.full_name || 'Freelancer'
          : employer?.company_name || employer?.full_name || 'İşveren'
        const latest = latestByProposal.get(conversation.id)
        const preview = latest ? `${latest.sender_id === user.id ? 'Sen: ' : ''}${latest.body}` : 'Henüz mesaj yok. İlk mesajı gönder.'
        const updatedAt = latest?.created_at || conversation.updated_at
        const unreadCount = unreadByProposal.get(conversation.id) ?? 0
        const initials = counterpart.split(' ').slice(0, 2).map((part) => part[0]).join('').toLocaleUpperCase('tr-TR')

        return <Link className="conversation-card" href={`/messages/${conversation.id}`} key={conversation.id}>
          <span className="conversation-avatar" aria-hidden="true">{initials}</span>
          <span className="conversation-copy"><strong>{counterpart}</strong><small>{job?.title || 'Aktif proje'}</small><em>{preview}</em></span>
          <span className="conversation-meta"><time>{formatNotificationTime(updatedAt)}</time>{unreadCount > 0 && <strong aria-label={`${unreadCount} okunmamış mesaj`}>{Math.min(unreadCount, 99)}{unreadCount > 99 ? '+' : ''}</strong>}<b aria-hidden="true">→</b></span>
        </Link>
      })}
    </section> : <div className="marketplace-empty"><strong>Henüz aktif konuşman yok</strong><p>Bir teklif kabul edildiğinde proje konuşman burada görünecek.</p></div>}
  </MarketplaceShell>
}
