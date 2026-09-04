'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/role'
import { FAVORITE_PREFIX, MAX_FAVORITES, getFavorites, isJobId } from '@/lib/favorites'

export async function setJobFavorite(jobId: string, saved: boolean) {
  const { supabase, user } = await requireRole('freelancer')
  if (!isJobId(jobId) || typeof saved !== 'boolean') return { error: 'Geçersiz ilan.' }
  const favorites = getFavorites(user.user_metadata)
  const existing = favorites.find((favorite) => favorite.jobId === jobId)
  if (saved) {
    if (!existing && favorites.length >= MAX_FAVORITES) return { error: `En fazla ${MAX_FAVORITES} ilan kaydedebilirsin. Önce bir favoriyi kaldır.` }
    const { data: job, error } = await supabase.from('jobs').select('id').eq('id', jobId).maybeSingle()
    if (error || !job) return { error: 'İlan bulunamadı veya şu anda erişilemiyor.' }
  }
  // Only change this bookmark; preserve profile, settings and message state.
  const { error } = await supabase.auth.updateUser({ data: { [`${FAVORITE_PREFIX}${jobId}`]: saved ? (existing?.savedAt ?? new Date().toISOString()) : null } })
  if (error) return { error: 'Favorilerin güncellenemedi. Lütfen tekrar dene.' }
  for (const path of ['/freelancer/favorites', '/freelancer', '/jobs', `/jobs/${jobId}`]) revalidatePath(path)
  return { saved }
}
