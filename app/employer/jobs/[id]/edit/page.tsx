import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MarketplaceShell } from '@/app/marketplace-shell'
import { requireRole } from '@/lib/auth/role'
import { formatDate } from '@/lib/marketplace'
import { EditJobForm } from './edit-job-form'

const revisionFieldLabels: Record<string, string> = { title: 'Başlık', description: 'Açıklama', category: 'Kategori', skills: 'Beceriler', budget: 'Bütçe', deadline: 'Takvim' }

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Projeyi düzenle — Taskavia' }

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, user, fullName } = await requireRole('employer')
  const { data: job, error } = await supabase.from('jobs').select('id, title, description, status, updated_at').eq('id', id).eq('employer_id', user.id).maybeSingle()
  if (error) throw new Error('İlan bilgileri yüklenemedi.')
  if (!job) notFound()
  const { data: revisions } = await supabase.from('job_revisions').select('id, title, changed_fields, created_at').eq('job_id', id).order('created_at', { ascending: false }).limit(10)
  const editable = ['open', 'draft', 'closed'].includes(job.status)
  return <MarketplaceShell name={fullName} role="employer" active="dashboard">
    <div className="marketplace-page-head"><div><p>PROJEN</p><h1>Projeyi düzenle</h1></div><Link href={`/jobs/${id}`}>← İlana dön</Link></div>
    {editable ? <><EditJobForm job={job} />{revisions?.length ? <section className="job-revision-history"><div className="dashboard-section-title"><div><p>DÜZENLEME GEÇMİŞİ</p><h2>Neler değişti</h2></div></div><ul>{revisions.map((revision) => <li key={revision.id}><small>{formatDate(revision.created_at)}</small><strong>{(revision.changed_fields as string[]).map((field) => revisionFieldLabels[field] ?? field).join(', ')} güncellendi</strong><p>{revision.title}</p></li>)}</ul></section> : null}</> : <div className="marketplace-empty"><p>Devam eden veya tamamlanmış projelerin içeriği değiştirilemez.</p><Link href={`/jobs/${id}`}>İlanı görüntüle →</Link></div>}
  </MarketplaceShell>
}
