import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MarketplaceShell } from '@/app/marketplace-shell'
import { requireRole } from '@/lib/auth/role'
import { EditJobForm } from './edit-job-form'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Projeyi düzenle — Taskavia' }

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, user, fullName } = await requireRole('employer')
  const { data: job, error } = await supabase.from('jobs').select('id, title, description, status, updated_at').eq('id', id).eq('employer_id', user.id).maybeSingle()
  if (error) throw new Error('İlan bilgileri yüklenemedi.')
  if (!job) notFound()
  return <MarketplaceShell name={fullName} role="employer" active="dashboard">
    <div className="marketplace-page-head"><div><p>PROJEN</p><h1>Projeyi düzenle</h1></div><Link href={`/jobs/${id}`}>← İlana dön</Link></div>
    {job.status === 'open' ? <EditJobForm job={job} /> : <div className="marketplace-empty"><p>Yalnızca teklif almaya açık projeler düzenlenebilir.</p><Link href={`/jobs/${id}`}>İlanı görüntüle →</Link></div>}
  </MarketplaceShell>
}
