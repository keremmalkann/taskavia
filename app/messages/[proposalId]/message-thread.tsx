'use client'

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from 'react'
import { createClient } from '@/lib/supabase/client'
import { sendMessage } from '@/lib/actions/marketplace'
import { MESSAGE_READ_EVENT } from '@/app/message-shortcut'
import { PendingSubmitButton } from '@/app/pending-submit-button'
import { SafetyActions } from '@/app/safety-actions'

type Message = {
  id: string
  sender_id: string
  body: string
  read_at: string | null
  created_at: string
  attachment_path?: string | null
  attachment_name?: string | null
  attachment_type?: string | null
  attachment_size?: number | null
  attachment_url?: string | null
}

type MessageThreadProps = {
  proposalId: string
  userId: string
  currentUserName: string
  counterpartName: string
  jobTitle: string
  initialMessages: Message[]
  blocked?: boolean
  attachmentEnabled?: boolean
}

async function markConversationRead(proposalId: string) {
  try {
    const response = await fetch('/api/messages/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proposalId }),
    })
    if (response.ok) window.dispatchEvent(new Event(MESSAGE_READ_EVENT))
  } catch {
    // Açık konuşmada bir sonraki mesaj veya sayfa odağı yeniden dener.
  }
}

function formatFileSize(bytes?: number | null) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function MessageThread({
  proposalId,
  userId,
  currentUserName,
  counterpartName,
  jobTitle,
  initialMessages,
  blocked = false,
  attachmentEnabled = false,
}: MessageThreadProps) {
  const [messages, setMessages] = useState(initialMessages)
  const [query, setQuery] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [counterpartTyping, setCounterpartTyping] = useState(false)
  const messageListRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const counterpartInitials = counterpartName.split(' ').slice(0, 2).map((part) => part[0]).join('').toLocaleUpperCase('tr-TR')
  const normalizedQuery = query.trim().toLocaleLowerCase('tr-TR')
  const visibleMessages = useMemo(() => normalizedQuery
    ? messages.filter((message) => `${message.body} ${message.attachment_name ?? ''}`.toLocaleLowerCase('tr-TR').includes(normalizedQuery))
    : messages, [messages, normalizedQuery])

  useEffect(() => {
    void markConversationRead(proposalId)
    const markOnFocus = () => void markConversationRead(proposalId)
    window.addEventListener('focus', markOnFocus)
    return () => window.removeEventListener('focus', markOnFocus)
  }, [proposalId])

  useEffect(() => {
    const messageList = messageListRef.current
    if (!messageList || normalizedQuery) return
    messageList.scrollTo({ top: messageList.scrollHeight, behavior: 'smooth' })
  }, [messages.length, normalizedQuery])

  useEffect(() => {
    const supabase = createClient()
    const hydrateAttachment = async (message: Message) => {
      if (!message.attachment_path) return message
      const { data } = await supabase.storage.from('message-attachments').createSignedUrl(message.attachment_path, 60 * 60)
      return { ...message, attachment_url: data?.signedUrl ?? null }
    }
    const channel = supabase.channel(`proposal:${proposalId}`, { config: { broadcast: { self: false } } })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages', filter: `proposal_id=eq.${proposalId}`,
      }, (payload) => {
        const incoming = payload.new as Message
        void hydrateAttachment(incoming).then((hydrated) => {
          setMessages((current) => current.some((message) => message.id === hydrated.id) ? current : [...current, hydrated])
        })
        if (incoming.sender_id !== userId) void markConversationRead(proposalId)
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'messages', filter: `proposal_id=eq.${proposalId}`,
      }, (payload) => {
        const updated = payload.new as Message
        setMessages((current) => current.map((message) => message.id === updated.id ? { ...message, ...updated } : message))
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        setCounterpartTyping(Boolean(payload?.typing))
      })
      .subscribe()
    channelRef.current = channel

    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
      channelRef.current = null
      void supabase.removeChannel(channel)
    }
  }, [proposalId, userId])

  const announceTyping = (typing: boolean) => {
    void channelRef.current?.send({ type: 'broadcast', event: 'typing', payload: { typing } })
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    if (typing) typingTimerRef.current = setTimeout(() => announceTyping(false), 1400)
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(event.currentTarget.files?.[0] ?? null)
  }

  return <div className="message-thread">
    <header className="conversation-toolbar">
      <span className="conversation-toolbar-avatar" aria-hidden="true">{counterpartInitials}</span>
      <div><strong>{counterpartName}</strong><small>{counterpartTyping ? 'Yazıyor…' : jobTitle}</small></div>
      <span className={`conversation-status${blocked ? ' blocked' : ''}`}><i aria-hidden="true" /> {blocked ? 'Mesajlaşma engellendi' : counterpartTyping ? 'Yazıyor' : 'Aktif proje'}</span>
    </header>
    <div className="message-search">
      <span aria-hidden="true">⌕</span>
      <input value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="Konuşmada ara" aria-label="Konuşmada ara" />
      {query && <button type="button" onClick={() => setQuery('')} aria-label="Aramayı temizle">×</button>}
      {normalizedQuery && <small>{visibleMessages.length} sonuç</small>}
    </div>
    <div className="message-list" ref={messageListRef} aria-live="polite">
      {visibleMessages.map((message) => {
        const isMine = message.sender_id === userId

        return <article className={isMine ? 'outgoing' : 'incoming'} key={message.id} aria-label={`${isMine ? currentUserName : counterpartName} tarafından gönderildi`}>
          <strong>{isMine ? 'Sen' : counterpartName}</strong>
          {message.body && <p>{message.body}</p>}
          {message.attachment_path && <a className="message-attachment" href={message.attachment_url ?? '#'} target="_blank" rel="noreferrer" aria-disabled={!message.attachment_url}>
            <span aria-hidden="true">↗</span>
            <span><b>{message.attachment_name ?? 'Dosya'}</b><small>{formatFileSize(message.attachment_size)}</small></span>
          </a>}
          <footer><time>{new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }).format(new Date(message.created_at))}</time>{isMine && <span>{message.read_at ? 'Okundu' : 'İletildi'} <i aria-hidden="true">✓{message.read_at ? '✓' : ''}</i></span>}</footer>
          {!isMine && <SafetyActions compact label="Bildir" returnPath={`/messages/${proposalId}`} subjectType="message" subjectId={message.id} />}
        </article>
      })}
      {messages.length === 0 && <div className="marketplace-empty"><p>İlk mesajı göndererek çalışma alanını başlat.</p></div>}
      {messages.length > 0 && visibleMessages.length === 0 && <div className="marketplace-empty"><strong>Mesaj bulunamadı</strong><p>Başka bir kelime veya dosya adı dene.</p></div>}
      {counterpartTyping && !normalizedQuery && <div className="typing-indicator" aria-label={`${counterpartName} yazıyor`}><i /><i /><i /></div>}
    </div>
    {blocked ? <div className="message-blocked-banner"><strong>Bu konuşmada mesaj gönderilemiyor.</strong><span>Engeli sen koyduysan güvenlik menüsünden kaldırabilirsin.</span></div> : <form action={sendMessage.bind(null, proposalId)} className="message-composer" onSubmit={() => announceTyping(false)}>
      <label className={`message-attachment-picker${attachmentEnabled ? '' : ' disabled'}`} title={attachmentEnabled ? 'Dosya ekle' : 'Dosya paylaşımı için veritabanı güncellemesi gerekli'}>
        <span aria-hidden="true">＋</span><span className="sr-only">Dosya ekle</span>
        <input ref={fileInputRef} name="attachment" type="file" accept="image/jpeg,image/png,image/webp,application/pdf,text/plain,application/zip,.docx,.xlsx" disabled={!attachmentEnabled} onChange={handleFileChange} />
      </label>
      <div className="message-composer-field">
        {selectedFile && <div className="message-selected-file"><span>{selectedFile.name}</span><button type="button" onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }} aria-label="Dosyayı kaldır">×</button></div>}
        <textarea
          aria-label="Mesaj"
          name="body"
          maxLength={3000}
          rows={1}
          placeholder={selectedFile ? 'Dosyaya bir not ekle (isteğe bağlı)' : 'Mesaj yaz'}
          onBlur={() => announceTyping(false)}
          onInput={(event: FormEvent<HTMLTextAreaElement>) => {
            const field = event.currentTarget
            field.style.height = 'auto'
            field.style.height = `${Math.min(field.scrollHeight, 120)}px`
            announceTyping(field.value.trim().length > 0)
          }}
          onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => {
            if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return
            event.preventDefault()
            event.currentTarget.form?.requestSubmit()
          }}
        />
      </div>
      <PendingSubmitButton iconOnly pendingLabel="Mesaj gönderiliyor" aria-label="Mesajı gönder" title="Mesajı gönder"><span aria-hidden="true">➤</span></PendingSubmitButton>
    </form>}
  </div>
}
