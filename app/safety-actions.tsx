import { submitSafetyReport, toggleUserBlock } from '@/lib/actions/safety'
import { PendingSubmitButton } from '@/app/pending-submit-button'

type SafetyActionsProps = {
  returnPath: string
  subjectType: 'user' | 'job' | 'message'
  subjectId: string
  targetUserId?: string
  blockedByMe?: boolean
  relationshipBlocked?: boolean
  compact?: boolean
  label?: string
}

export function SafetyActions({ returnPath, subjectType, subjectId, targetUserId, blockedByMe = false, relationshipBlocked = false, compact = false, label = 'Güvenlik' }: SafetyActionsProps) {
  return <details className={`safety-menu${compact ? ' compact' : ''}`}>
    <summary aria-label={`${label} işlemleri`}>{label} <span aria-hidden="true">•••</span></summary>
    <div className="safety-menu-panel">
      {relationshipBlocked && <p className="safety-blocked-note">Bu kullanıcıyla etkileşim engellendi.</p>}
      {targetUserId && <form action={toggleUserBlock.bind(null, targetUserId, returnPath, blockedByMe ? 'unblock' : 'block')}>
        <PendingSubmitButton className={blockedByMe ? 'safety-unblock' : 'safety-block'} pendingLabel="Güncelleniyor…">{blockedByMe ? 'Engeli kaldır' : 'Kullanıcıyı engelle'}</PendingSubmitButton>
      </form>}
      <form action={submitSafetyReport.bind(null, subjectType, subjectId, returnPath)} className="safety-report-form">
        <label>Neden
          <select name="reason" defaultValue="" required>
            <option value="" disabled>Bir neden seç</option>
            <option value="spam">Spam / yanıltıcı içerik</option>
            <option value="fraud">Dolandırıcılık şüphesi</option>
            <option value="harassment">Taciz / uygunsuz iletişim</option>
            <option value="inappropriate">Uygunsuz içerik</option>
            <option value="other">Diğer</option>
          </select>
        </label>
        <label>Açıklama
          <textarea name="details" minLength={10} maxLength={1000} required rows={3} placeholder="İnceleme ekibine durumu kısaca anlat…" />
        </label>
        <PendingSubmitButton pendingLabel="Gönderiliyor…">Şikâyeti gönder</PendingSubmitButton>
      </form>
    </div>
  </details>
}
