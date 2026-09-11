'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/role'
import { portfolioStoragePath } from '@/lib/portfolio-files'
import { createAdminClient } from '@/lib/supabase/admin'

function go(kind: 'error' | 'message', message: string): never {
  redirect(`/settings?${kind}=${encodeURIComponent(message)}`)
}

function checked(formData: FormData, key: string) {
  return formData.get(key) === 'on'
}

export async function updateSettings(formData: FormData) {
  const { supabase, user } = await requireUser()
  const visibilityValue = String(formData.get('profileVisibility') ?? '')
  const profileVisibility = visibilityValue === 'members' ? 'members' : 'public'
  const currentSettings = user.user_metadata.settings && typeof user.user_metadata.settings === 'object'
    ? user.user_metadata.settings
    : {}

  const settings = {
    ...currentSettings,
    notifications: {
      messages: checked(formData, 'notifyMessages'),
      project_updates: checked(formData, 'notifyProjectUpdates'),
      opportunities: checked(formData, 'notifyOpportunities'),
      weekly_digest: checked(formData, 'notifyWeeklyDigest'),
      marketing: checked(formData, 'notifyMarketing'),
    },
    privacy: {
      profile_visibility: profileVisibility,
      show_activity: checked(formData, 'showActivity'),
      show_completed_jobs: checked(formData, 'showCompletedJobs'),
    },
    locale: 'tr-TR',
    currency: 'TRY',
    timezone: 'Europe/Istanbul',
  }

  const { error: profileError } = await supabase.from('profiles').update({
    profile_visibility: profileVisibility,
    show_activity: settings.privacy.show_activity,
    show_completed_jobs: settings.privacy.show_completed_jobs,
  }).eq('id', user.id)
  if (profileError) go('error', 'Gizlilik ayarları kaydedilemedi. Supabase migration kurulumunu kontrol et.')

  const { error } = await supabase.auth.updateUser({ data: { settings } })
  if (error) go('error', 'Ayarların kaydedilemedi. Lütfen tekrar dene.')

  revalidatePath('/settings')
  go('message', 'Ayarların kaydedildi.')
}

export async function changePassword(formData: FormData) {
  const { supabase } = await requireUser()
  const password = String(formData.get('password') ?? '')
  const confirmation = String(formData.get('passwordConfirmation') ?? '')

  if (password.length < 8) go('error', 'Yeni şifren en az 8 karakter olmalı.')
  if (password !== confirmation) go('error', 'Şifreler birbiriyle eşleşmiyor.')

  const { error } = await supabase.auth.updateUser({ password })
  if (error) go('error', 'Şifren değiştirilemedi. Yeniden giriş yapıp tekrar dene.')

  go('message', 'Şifren başarıyla değiştirildi.')
}

export async function signOutEverywhere() {
  const { supabase } = await requireUser()
  const { error } = await supabase.auth.signOut({ scope: 'global' })
  if (error) go('error', 'Oturumlar kapatılamadı. Lütfen tekrar dene.')
  redirect('/login?message=' + encodeURIComponent('Tüm cihazlardaki oturumların kapatıldı.'))
}

export async function deleteAccount(formData: FormData) {
  const confirmation = String(formData.get('confirmation') ?? '').trim().toLocaleUpperCase('tr-TR')
  if (confirmation !== 'HESABIMI SİL') go('error', 'Hesabı silmek için onay alanına HESABIMI SİL yazmalısın.')

  const { supabase, user } = await requireUser()
  const admin = createAdminClient()
  if (!admin) go('error', 'Hesap silme servisi şu anda kullanılamıyor. Lütfen daha sonra tekrar dene.')

  const [{ data: profile, error: profileError }, { data: portfolioItems, error: portfolioError }] = await Promise.all([
    admin.from('profiles').select('portfolio_url, resume_path').eq('id', user.id).maybeSingle(),
    admin.from('portfolio_items').select('file_url').eq('profile_id', user.id),
  ])
  if (profileError || portfolioError) go('error', 'Hesap verileri silme işlemine hazırlanamadı. Lütfen tekrar dene.')

  const portfolioPaths = [
    portfolioStoragePath(profile?.portfolio_url ?? null),
    ...(portfolioItems ?? []).map((item) => portfolioStoragePath(item.file_url)),
  ].filter((path): path is string => Boolean(path))
  if (portfolioPaths.length) {
    const { error } = await admin.storage.from('portfolios').remove(portfolioPaths)
    if (error) go('error', 'Portföy dosyaları silinemedi. Lütfen tekrar dene.')
  }

  if (profile?.resume_path) {
    const { error } = await admin.storage.from('resumes').remove([profile.resume_path])
    if (error) go('error', 'Özgeçmiş dosyası silinemedi. Lütfen tekrar dene.')
  }

  const { data: messageAttachments, error: messageAttachmentError } = await admin
    .from('messages')
    .select('attachment_path')
    .eq('sender_id', user.id)
    .not('attachment_path', 'is', null)
  if (messageAttachmentError && !['42703', 'PGRST204'].includes(messageAttachmentError.code ?? '')) {
    go('error', 'Mesaj dosyaları silme işlemine hazırlanamadı. Lütfen tekrar dene.')
  }
  const messageAttachmentPaths = (messageAttachments ?? []).flatMap((message) => message.attachment_path ? [message.attachment_path] : [])
  if (messageAttachmentPaths.length) {
    const { error } = await admin.storage.from('message-attachments').remove(messageAttachmentPaths)
    if (error) go('error', 'Mesaj dosyaları silinemedi. Lütfen tekrar dene.')
  }

  const { error: paymentError } = await admin
    .from('payments')
    .delete()
    .or(`employer_id.eq.${user.id},freelancer_id.eq.${user.id}`)
  if (paymentError) go('error', 'Hesabın ilişkili ödeme kayıtları temizlenemedi. Lütfen tekrar dene.')

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id)
  if (deleteError) go('error', 'Hesap tamamen silinemedi. Lütfen tekrar dene.')

  await supabase.auth.signOut({ scope: 'local' })
  redirect('/signup?message=' + encodeURIComponent('Hesabın ve ilişkili verilerin kalıcı olarak silindi. Aynı e-posta adresiyle yeniden kayıt olabilirsin.'))
}
