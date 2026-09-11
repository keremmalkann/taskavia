import type { Metadata } from 'next'
import { MarketplaceShell, Feedback } from '@/app/marketplace-shell'
import { requireRole } from '@/lib/auth/role'
import { JobCreateForm } from './job-create-form'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Yeni İlan — Taskavia', description: 'Yeni proje veya görev ilanı yayınla.' }

export default async function NewJobPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const params = await searchParams
  const { fullName } = await requireRole('employer')
  const minDeadline = new Date().toISOString().slice(0, 10)
  return <MarketplaceShell name={fullName} role="employer" active="new-job">
    <div className="marketplace-page-head"><div><p>YENİ PROJE</p><h1>İhtiyacını anlat.</h1><span>Net kapsam ve gerçekçi bütçe, doğru freelancer’lardan daha iyi teklifler getirir.</span></div></div>
    <Feedback {...params} />
    <JobCreateForm minDeadline={minDeadline} />
  </MarketplaceShell>
}
