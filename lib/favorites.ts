// Each bookmark has its own metadata key so saves from different tabs do not
// overwrite the entire list. This is account-owned data, never authorization.
export const FAVORITE_PREFIX = 'favorite_job_'
export const MAX_FAVORITES = 50
export const isJobId = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)

export function getFavorites(metadata: Record<string, unknown> | undefined) {
  return Object.entries(metadata ?? {})
    .filter(([key, value]) => key.startsWith(FAVORITE_PREFIX) && isJobId(key.slice(FAVORITE_PREFIX.length)) && typeof value === 'string' && Number.isFinite(Date.parse(value)))
    .map(([key, value]) => ({ jobId: key.slice(FAVORITE_PREFIX.length), savedAt: value as string }))
    .sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt))
    .slice(0, MAX_FAVORITES)
}
