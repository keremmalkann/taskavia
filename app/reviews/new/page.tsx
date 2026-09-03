import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { MarketplaceShell, Feedback } from '@/app/marketplace-shell'
import { createReview } from '@/lib/actions/marketplace'
import { requireUser } from '@/lib/auth/role'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Değerlendirme — Taskavia', description: 'Tamamlanan iş için puan ve yorum bırak.' }

export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ job?: string; to?: string; error?: string; message?: string }> }) {
  const params = await searchParams
  const { supabase, role, fullName } = await requireUser()
  if (!params.job || !params.to) notFound()
  const [{ data: job }, { data: reviewee }] = await Promise.all([
    supabase.from('jobs').select('id, title, status').eq('id', params.job).maybeSingle(),
    supabase.from('profiles').select('id, full_name, title').eq('id', params.to).maybeSingle(),
  ])
  if (!job || !reviewee || job.status !== 'completed') notFound()

  return <MarketplaceShell name={fullName} role={role} active="dashboard">
    <div className="marketplace-page-head"><div><p>GÜVEN & İTİBAR</p><h1>Deneyimini paylaş.</h1><span>{job.title} projesindeki çalışmanı değerlendir.</span></div></div>
    <Feedback {...params} />
    <form action={createReview.bind(null, job.id, reviewee.id)} className="marketplace-form review-form"><div className="review-person"><span>{reviewee.full_name.slice(0, 2).toLocaleUpperCase('tr-TR')}</span><div><strong>{reviewee.full_name}</strong><small>{reviewee.title || 'Taskavia üyesi'}</small></div></div><label>Puan<select name="rating" required defaultValue="5"><option value="5">★★★★★ — Mükemmel</option><option value="4">★★★★☆ — Çok iyi</option><option value="3">★★★☆☆ — İyi</option><option value="2">★★☆☆☆ — Geliştirilebilir</option><option value="1">★☆☆☆☆ — Kötü</option></select></label><label>Yorum<textarea name="comment" rows={6} maxLength={1500} placeholder="İletişim, teslimat kalitesi ve çalışma deneyimini anlat." /></label><button className="marketplace-submit" type="submit">Değerlendirmeyi yayınla →</button></form>
  </MarketplaceShell>
}
