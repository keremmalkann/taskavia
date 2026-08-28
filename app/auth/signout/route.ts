import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const requestUrl = new URL(request.url)
  const origin = request.headers.get('origin')

  if (origin && origin !== requestUrl.origin) {
    return new Response(null, { status: 403 })
  }

  const supabase = await createClient()
  await supabase.auth.signOut({ scope: 'local' })

  return new Response(null, {
    status: 204,
    headers: { 'Cache-Control': 'no-store' },
  })
}
