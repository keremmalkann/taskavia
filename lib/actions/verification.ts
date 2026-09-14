'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/role'

function go(kind: 'error' | 'message', message: string): never {
  redirect(`/profile?${kind}=${encodeURIComponent(message)}#profile-section-06`)
}

function normalizePhone(value: string) {
  const compact = value.trim().replace(/[\s().-]/g, '')
  if (/^0\d{10}$/.test(compact)) return `+90${compact.slice(1)}`
  if (/^\d{10}$/.test(compact)) return `+90${compact}`
  return compact
}

export async function startPhoneVerification(formData: FormData) {
  const { supabase, user } = await requireUser()
  const phone = normalizePhone(String(formData.get('phone') ?? ''))
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) go('error', 'Telefon numarasını ülke koduyla birlikte geçerli biçimde gir.')

  const currentMetadata = user.user_metadata && typeof user.user_metadata === 'object' ? user.user_metadata : {}
  const { error } = await supabase.auth.updateUser({
    phone,
    data: { ...currentMetadata, pending_phone_verification: phone },
  })
  if (error) {
    const providerDisabled = error.code === 'phone_provider_disabled' || /phone provider|sms provider/i.test(error.message)
    go('error', providerDisabled
      ? 'SMS doğrulama sağlayıcısı henüz etkin değil. Supabase Auth telefon sağlayıcısı açıldığında bu alan çalışacaktır.'
      : 'Doğrulama kodu gönderilemedi. Numaranı kontrol edip yeniden dene.')
  }

  revalidatePath('/profile')
  go('message', 'Doğrulama kodu telefonuna gönderildi. Kodu aşağıdaki alana gir.')
}

export async function verifyPhoneCode(formData: FormData) {
  const { supabase, user } = await requireUser()
  const token = String(formData.get('token') ?? '').trim()
  const phone = normalizePhone(String(user.user_metadata?.pending_phone_verification ?? ''))
  if (!/^\d{6}$/.test(token)) go('error', 'Doğrulama kodu 6 haneli olmalı.')
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) go('error', 'Bekleyen telefon doğrulaması bulunamadı. Önce yeni kod iste.')

  const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'phone_change' })
  if (error) go('error', 'Kod geçersiz veya süresi dolmuş. Yeni kod isteyip tekrar dene.')

  const { error: syncError } = await supabase.rpc('sync_phone_verification')
  if (syncError) go('error', 'Telefon doğrulandı ancak güven profiline işlenemedi. Migration kurulumunu kontrol et.')

  const currentMetadata = user.user_metadata && typeof user.user_metadata === 'object' ? user.user_metadata : {}
  const metadata: Record<string, unknown> = { ...currentMetadata }
  delete metadata.pending_phone_verification
  await supabase.auth.updateUser({ data: metadata })
  revalidatePath('/profile')
  revalidatePath(`/profiles/${user.id}`)
  go('message', 'Telefon numaran doğrulandı ve güven profiline eklendi.')
}

export async function submitProfileVerification(formData: FormData) {
  const { supabase, role } = await requireUser()
  const kind = role === 'employer' ? 'company' : 'expertise'
  const label = String(formData.get('label') ?? '').trim()
  const evidenceUrl = String(formData.get('evidenceUrl') ?? '').trim()
  const evidenceNote = String(formData.get('evidenceNote') ?? '').trim()

  if (label.length < 2 || label.length > 120) go('error', kind === 'company' ? 'Önce şirket adını profilinde kaydet.' : 'Doğrulanacak uzmanlığı seç.')
  if (evidenceUrl && !/^https?:\/\/\S+$/i.test(evidenceUrl)) go('error', 'Kanıt bağlantısı http:// veya https:// ile başlamalı.')
  if (evidenceNote.length < 20 || evidenceNote.length > 1500) go('error', 'Doğrulama açıklaması 20–1500 karakter olmalı.')

  const { error } = await supabase.rpc('submit_profile_verification', {
    request_kind: kind,
    request_label: label,
    request_evidence_url: evidenceUrl || null,
    request_evidence_note: evidenceNote,
  })
  if (error) {
    if (error.code === '23505') go('error', 'Zaten incelenmeyi bekleyen bir doğrulama başvurun var.')
    if (/rate_limit_exceeded/i.test(error.message)) go('error', 'Bugünkü doğrulama başvuru sınırına ulaştın. Yarın yeniden deneyebilirsin.')
    if (/does not exist|schema cache|PGRST/i.test(error.message)) go('error', 'Güven doğrulama alanı henüz kurulmadı. Yeni Supabase migration dosyasını çalıştır.')
    go('error', 'Doğrulama başvurusu gönderilemedi. Profil bilgilerini ve kanıtlarını kontrol et.')
  }

  revalidatePath('/profile')
  go('message', 'Doğrulama başvurun yönetici incelemesine gönderildi.')
}

export async function cancelProfileVerification(requestId: string) {
  const { supabase } = await requireUser()
  const { error } = await supabase.rpc('cancel_profile_verification', { target_request_id: requestId })
  if (error) go('error', 'Başvuru iptal edilemedi; incelemeye alınmış olabilir.')
  revalidatePath('/profile')
  go('message', 'Doğrulama başvurun iptal edildi.')
}
