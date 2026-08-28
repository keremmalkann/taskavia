'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { sendMessage } from '@/lib/actions/marketplace'

type Message = { id: string; sender_id: string; body: string; created_at: string }

type MessageThreadProps = {
  proposalId: string
  userId: string
  currentUserName: string
  counterpartName: string
  initialMessages: Message[]
}

export function MessageThread({ proposalId, userId, currentUserName, counterpartName, initialMessages }: MessageThreadProps) {
  const [messages, setMessages] = useState(initialMessages)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel(`proposal:${proposalId}`).on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'messages', filter: `proposal_id=eq.${proposalId}`,
    }, (payload) => {
      const incoming = payload.new as Message
      setMessages((current) => current.some((message) => message.id === incoming.id) ? current : [...current, incoming])
    }).subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [proposalId])

  return <div className="message-thread">
    <div className="message-list">
      {messages.map((message) => {
        const isMine = message.sender_id === userId

        return <article className={isMine ? 'outgoing' : 'incoming'} key={message.id} aria-label={`${isMine ? currentUserName : counterpartName} tarafından gönderildi`}>
          <strong>{isMine ? 'Sen' : counterpartName}</strong>
          <p>{message.body}</p>
          <time>{new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }).format(new Date(message.created_at))}</time>
        </article>
      })}
      {messages.length === 0 && <div className="marketplace-empty"><p>İlk mesajı göndererek çalışma alanını başlat.</p></div>}
    </div>
    <form action={sendMessage.bind(null, proposalId)} className="message-composer"><textarea name="body" required maxLength={3000} rows={3} placeholder="Mesajını yaz…" /><button type="submit">Gönder →</button></form>
  </div>
}
