export const categories = ['Yazılım', 'Tasarım', 'Pazarlama', 'İçerik', 'Video & Ses', 'Danışmanlık'] as const

export function parseSkills(value: FormDataEntryValue | null) {
  return String(value ?? '')
    .split(',')
    .map((skill) => skill.trim())
    .filter(Boolean)
    .slice(0, 12)
}

export function formatCurrency(value: number | string | null | undefined) {
  const number = Number(value ?? 0)
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(number)
}

export function formatDate(value: string | null | undefined) {
  if (!value) return 'Tarih belirtilmedi'
  return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value))
}

export function messageFromError(error: { code?: string; message?: string } | null, fallback: string) {
  if (error?.message?.includes('rate_limit_exceeded')) return 'Çok hızlı işlem yapıyorsun. Lütfen kısa bir süre bekleyip tekrar dene.'
  if (!error) return fallback
  if (error.code === '23505') return 'Bu işlem daha önce yapılmış.'
  if (error.code === '42P01' || error.code === 'PGRST205') return 'Pazar yeri veritabanı kurulumu henüz tamamlanmadı.'
  return fallback
}
