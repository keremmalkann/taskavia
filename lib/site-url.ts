const productionUrl = "https://islik-freelance.keremmalkann.chatgpt.site"

export function getSiteUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || productionUrl
  const url = new URL(configuredUrl)

  if (url.protocol !== "https:" && url.hostname !== "localhost") {
    throw new Error("NEXT_PUBLIC_SITE_URL must use HTTPS")
  }

  return url.toString().replace(/\/$/, "")
}
