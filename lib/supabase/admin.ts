import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from './config'

export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) return null
  const { url } = getSupabaseConfig()
  return createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
}
