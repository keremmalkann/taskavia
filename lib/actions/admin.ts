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
