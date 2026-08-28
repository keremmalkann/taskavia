'use client'

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
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
  const messageListRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const messageList = messageListRef.current
    if (!messageList) return
    messageList.scrollTo({ top: messageList.scrollHeight, behavior: 'smooth' })
  }, [messages.length])

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
    <div className="message-list" ref={messageListRef}>
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
    <form action={sendMessage.bind(null, proposalId)} className="message-composer">
      <div className="message-composer-field">
        <textarea
          aria-label="Mesaj"
          name="body"
          required
          maxLength={3000}
          rows={1}
          placeholder="Mesaj yaz"
          onInput={(event: FormEvent<HTMLTextAreaElement>) => {
            const field = event.currentTarget
            field.style.height = 'auto'
            field.style.height = `${Math.min(field.scrollHeight, 120)}px`
          }}
          onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => {
            if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return
            event.preventDefault()
            event.currentTarget.form?.requestSubmit()
          }}
        />
      </div>
      <button type="submit" aria-label="Mesajı gönder" title="Mesajı gönder"><span aria-hidden="true">➤</span></button>
    </form>
  </div>
}
