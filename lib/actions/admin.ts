'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth/admin'

function go(kind: 'error' | 'message', message: string): never {
  redirect(`/admin?${kind}=${encodeURIComponent(message)}`)
}

export async function changeUserAccess(targetUserId: string, operation: 'suspend' | 'activate') {
  const { admin, user } = await requireAdmin()
  if (targetUserId === user.id) go('error', 'Kendi yönetici hesabını askıya alamazsın.')

  const { error } = await admin.auth.admin.updateUserById(targetUserId, {
    ban_duration: operation === 'suspend' ? '876000h' : 'none',
  })
  if (error) go('error', 'Kullanıcı durumu güncellenemedi.')

  revalidatePath('/admin')
  go('message', operation === 'suspend' ? 'Kullanıcı hesabı askıya alındı.' : 'Kullanıcı hesabı yeniden etkinleştirildi.')
}

export async function changeJobVisibility(jobId: string, operation: 'cancel' | 'reopen') {
  const { admin } = await requireAdmin()
  const expectedStatus = operation === 'cancel' ? 'open' : 'cancelled'
  const nextStatus = operation === 'cancel' ? 'cancelled' : 'open'
  const { data: job, error } = await admin
    .from('jobs')
    .update({ status: nextStatus })
    .eq('id', jobId)
    .eq('status', expectedStatus)
    .select('id')
    .maybeSingle()

  if (error || !job) go('error', 'İlan durumu değiştirilemedi. Yalnızca açık veya kaldırılmış ilanlar yönetilebilir.')
  if (operation === 'cancel') {
    await admin.from('proposals').update({ status: 'rejected' }).eq('job_id', jobId).eq('status', 'pending')
  }

  revalidatePath('/admin')
  revalidatePath('/jobs')
  revalidatePath(`/jobs/${jobId}`)
  revalidatePath('/employer')
  revalidatePath('/freelancer')
  go('message', operation === 'cancel' ? 'İlan yayından kaldırıldı.' : 'İlan yeniden yayına alındı.')
}

export async function changeReportStatus(reportId: string, operation: 'reviewing' | 'resolved' | 'dismissed', formData: FormData) {
  const { admin, user } = await requireAdmin()
  const note = String(formData.get('note') ?? '').trim().slice(0, 1000)
  const { data: report, error } = await admin
    .from('safety_reports')
    .update({ status: operation, resolution_note: note || null, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    .eq('id', reportId)
    .in('status', operation === 'reviewing' ? ['pending'] : ['pending', 'reviewing'])
    .select('id')
    .maybeSingle()
  if (error || !report) go('error', 'Şikâyet durumu güncellenemedi. Kayıt daha önce işlenmiş olabilir.')
  revalidatePath('/admin')
  go('message', operation === 'resolved' ? 'Şikâyet çözüldü olarak işaretlendi.' : operation === 'dismissed' ? 'Şikâyet kapatıldı.' : 'Şikâyet incelemeye alındı.')
}

export async function reviewProfileVerification(requestId: string, decision: 'reviewing' | 'approved' | 'rejected', formData: FormData) {
  const { admin, user } = await requireAdmin()
  const note = String(formData.get('note') ?? '').trim().slice(0, 1000)
  if (decision === 'rejected' && note.length < 10) go('error', 'Reddedilen başvuru için en az 10 karakterlik açıklama yazmalısın.')

  const { error } = await admin.rpc('review_profile_verification', {
    target_request_id: requestId,
    decision,
    reviewer_id: user.id,
    review_note: note || null,
  })
  if (error) go('error', 'Doğrulama başvurusu güncellenemedi. Migration kurulumunu veya başvuru durumunu kontrol et.')

  revalidatePath('/admin')
  revalidatePath('/profile')
  go('message', decision === 'approved' ? 'Doğrulama onaylandı ve profil rozeti oluşturuldu.' : decision === 'rejected' ? 'Doğrulama başvurusu gerekçesiyle reddedildi.' : 'Doğrulama başvurusu incelemeye alındı.')
}
