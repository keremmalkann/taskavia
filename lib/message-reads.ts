type UserMetadata = Record<string, unknown> | undefined

export type MessageReads = Record<string, string>

export function getMessageReads(metadata: UserMetadata): MessageReads {
  const value = metadata?.message_reads
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  return Object.fromEntries(
    Object.entries(value)
      .filter(([proposalId, readAt]) => proposalId.length > 0 && typeof readAt === 'string' && Number.isFinite(new Date(readAt).getTime()))
      .slice(0, 100)
  )
}

export function withMessageRead(reads: MessageReads, proposalId: string, readAt = new Date().toISOString()): MessageReads {
  return Object.fromEntries(
    Object.entries({ ...reads, [proposalId]: readAt })
      .sort(([, first], [, second]) => new Date(second).getTime() - new Date(first).getTime())
      .slice(0, 100)
  )
}

export function isMessageUnread(reads: MessageReads, proposalId: string, createdAt: string) {
  const readAt = reads[proposalId]
  return new Date(createdAt).getTime() > (readAt ? new Date(readAt).getTime() : 0)
}
