import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

const PORTFOLIO_MARKERS = [
  '/storage/v1/object/public/portfolios/',
  '/storage/v1/object/sign/portfolios/',
]

export function portfolioStoragePath(value: string | null | undefined) {
  if (!value) return null

  for (const marker of PORTFOLIO_MARKERS) {
    const index = value.indexOf(marker)
    if (index !== -1) return decodeURIComponent(value.slice(index + marker.length).split('?')[0])
  }

  return null
}

export async function resolvePortfolioUrl(supabase: SupabaseClient, value: string | null | undefined) {
  if (!value) return null
  const path = portfolioStoragePath(value)

  // Harici portföy bağlantıları Storage gizlilik politikasının dışında kalır.
  if (!path) return /^https?:\/\//.test(value) ? value : null

  const { data, error } = await supabase.storage.from('portfolios').createSignedUrl(path, 60 * 60)
  return error ? null : data.signedUrl
}
