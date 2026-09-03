import { getSiteUrl } from '@/lib/site-url'
import { createAdminClient } from '@/lib/supabase/admin'

type EmailPreference = 'messages' | 'project_updates'

type NotificationEmail = {
  recipientId: string
  preference: EmailPreference
  eventKey: string
  subject: string
  heading: string
  body: string
  ctaLabel: string
  ctaPath: string
}

type NotificationSettings = {
  notifications?: Partial<Record<EmailPreference, boolean>>
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function plainText(message: NotificationEmail, actionUrl: string) {
  return `${message.heading}\n\n${message.body}\n\n${message.ctaLabel}: ${actionUrl}\n\nBu e-posta Taskavia hesap tercihlerin doğrultusunda gönderildi.`
}

function emailHtml(message: NotificationEmail, actionUrl: string) {
  return `<!doctype html>
<html lang="tr">
  <body style="margin:0;background:#f1efe7;color:#17221f;font-family:Arial,sans-serif">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1efe7;padding:32px 16px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#fffdf8;border:1px solid #d9d6cc">
          <tr><td style="padding:24px 28px;background:#14211e;color:#d9ff64;font-size:22px;font-weight:800;letter-spacing:-0.5px">taskavia</td></tr>
          <tr><td style="padding:36px 28px 12px;font-family:Georgia,serif;font-size:32px;line-height:1.12;font-weight:700">${escapeHtml(message.heading)}</td></tr>
          <tr><td style="padding:0 28px 28px;color:#58625f;font-size:16px;line-height:1.65">${escapeHtml(message.body)}</td></tr>
          <tr><td style="padding:0 28px 36px"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#ff684f;color:#fff;text-decoration:none;font-weight:700;padding:15px 22px">${escapeHtml(message.ctaLabel)} →</a></td></tr>
          <tr><td style="padding:20px 28px;border-top:1px solid #e4e1d8;color:#7a817f;font-size:12px;line-height:1.5">Bu e-posta Taskavia bildirim tercihlerine göre gönderildi. Tercihlerini Ayarlar ekranından değiştirebilirsin.</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`
}

export async function sendNotificationEmail(message: NotificationEmail) {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from = process.env.EMAIL_FROM?.trim()
  const admin = createAdminClient()
  if (!apiKey || !from || !admin) return 'skipped' as const

  const { data, error } = await admin.auth.admin.getUserById(message.recipientId)
  const recipient = data.user
  if (error || !recipient?.email || !recipient.email_confirmed_at) return 'skipped' as const

  const settings = (recipient.user_metadata.settings ?? {}) as NotificationSettings
  if (settings.notifications?.[message.preference] === false) return 'skipped' as const

  const actionUrl = `${getSiteUrl()}${message.ctaPath.startsWith('/') ? message.ctaPath : `/${message.ctaPath}`}`
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `taskavia/${message.eventKey}`.slice(0, 256),
      },
      body: JSON.stringify({
        from,
        to: [recipient.email],
        subject: message.subject,
        html: emailHtml(message, actionUrl),
        text: plainText(message, actionUrl),
      }),
    })
    if (!response.ok) {
      console.error('Taskavia notification email failed', response.status, await response.text())
      return 'failed' as const
    }
    return 'sent' as const
  } catch (error) {
    console.error('Taskavia notification email failed', error)
    return 'failed' as const
  }
}
