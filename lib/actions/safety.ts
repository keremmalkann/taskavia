'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/role'

const allowedReturnPaths = /^\/(?:jobs\/[0-9a-f-]+|profiles\/[0-9a-f-]+|messages\/[0-9a-f-]+)$/i

function returnPath(path: string) {
  return allowedReturnPaths.test(path) ? path : '/settings'
}

function go(path: string, kind: 'error' | 'message', message: string): never {
  const separator = path.includes('?') ? '&' : '?'
  redirect(`${path}${separator}${kind}=${encodeURIComponent(message)}`)
}

export async function toggleUserBlock(targetUserId: string, path: string, operation: 'block' | 'unblock') {
  const { supabase, user } = await requireUser()
  const safePath = returnPath(path)
  if (targetUserId === user.id) go(safePath, 'error', 'Kendi hesabını engelleyemezsin.')

  const { data: target } = await supabase.from('profiles').select('id').eq('id', targetUserId).maybeSingle()
  if (!target) go(safePath, 'error', 'Kullanıcı bulunamadı.')

  const result = operation === 'block'
    ? await supabase.from('user_blocks').upsert({ blocker_id: user.id, blocked_id: targetUserId }, { onConflict: 'blocker_id,blocked_id' })
    : await supabase.from('user_blocks').delete().eq('blocker_id', user.id).eq('blocked_id', targetUserId)
  if (result.error) go(safePath, 'error', 'Engelleme tercihi güncellenemedi. Veritabanı migration dosyasını kontrol et.')

  revalidatePath(safePath)
  if (operation === 'block' && safePath.startsWith('/messages/')) {
    redirect('/messages?message=' + encodeURIComponent('Kullanıcı engellendi. Bu konuşmada artık mesaj gönderilemez.'))
  }
  go(safePath, 'message', operation === 'block' ? 'Kullanıcı engellendi.' : 'Kullanıcı engeli kaldırıldı.')
}

export async function submitSafetyReport(subjectType: 'user' | 'job' | 'message', subjectId: string, path: string, formData: FormData) {
  const { supabase } = await requireUser()
  const safePath = returnPath(path)
  const reason = String(formData.get('reason') ?? '')
  const details = String(formData.get('details') ?? '').trim()
  if (!['spam', 'fraud', 'harassment', 'inappropriate', 'other'].includes(reason) || details.length < 10 || details.length > 1000) {
    go(safePath, 'error', 'Şikâyet nedenini seç ve en az 10 karakterlik bir açıklama yaz.')
  }

  const { error } = await supabase.rpc('submit_safety_report', {
    target_subject_type: subjectType,
    target_subject_id: subjectId,
    report_reason: reason,
    report_details: details,
  })
  if (error) {
    const rateLimited = error.message?.includes('rate_limit_exceeded')
    go(safePath, 'error', rateLimited ? 'Günlük şikâyet limitine ulaştın. Daha sonra tekrar dene.' : 'Şikâyet kaydedilemedi. İçeriği görüntüleme yetkini ve migration kurulumunu kontrol et.')
  }
  revalidatePath('/admin')
  go(safePath, 'message', 'Şikâyetin inceleme ekibine güvenli biçimde iletildi.')
}
