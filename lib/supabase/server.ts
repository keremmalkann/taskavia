import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseConfig } from './config'

export async function createClient() {
  const cookieStore = await cookies()
  const { url, anonKey } = getSupabaseConfig()

  return createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              const sessionOptions = { ...options }
              delete sessionOptions.maxAge
              delete sessionOptions.expires
              cookieStore.set(name, value, sessionOptions)
            })
          } catch {
            // Server Component'ten çağrılırsa göz ardı edilebilir, middleware hallediyor
          }
        },
      },
    }
  )
}
