function normalizeProjectUrl(value: string | undefined) {
  const projectUrl = value?.trim().replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "")

  if (!projectUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured")
  }

  const parsedUrl = new URL(projectUrl)

  if (parsedUrl.protocol !== "https:" && parsedUrl.hostname !== "localhost") {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must use HTTPS")
  }

  return parsedUrl.toString().replace(/\/$/, "")
}

export function getSupabaseConfig() {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

  if (!anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured")
  }

  return {
    url: normalizeProjectUrl(process.env.NEXT_PUBLIC_SUPABASE_URL),
    anonKey,
  }
}
