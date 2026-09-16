'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/role'

function go(kind: 'error' | 'message', message: string): never {
  redirect(`/profile?${kind}=${encodeURIComponent(message)}#profile-section-06`)
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
