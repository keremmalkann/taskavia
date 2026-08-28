'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/role'

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
