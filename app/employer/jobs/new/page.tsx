import type { Metadata } from 'next'
import { MarketplaceShell, Feedback } from '@/app/marketplace-shell'
import { createJob } from '@/lib/actions/marketplace'
import { requireRole } from '@/lib/auth/role'
import { JobProjectFields } from './job-project-fields'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Yeni İlan — İşlik', description: 'Yeni proje veya görev ilanı yayınla.' }

export default async function NewJobPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const params = await searchParams
  const { fullName } = await requireRole('employer')
  return <MarketplaceShell name={fullName} role="employer" active="new-job">
    <div className="marketplace-page-head"><div><p>YENİ PROJE</p><h1>İhtiyacını anlat.</h1><span>Net kapsam ve gerçekçi bütçe, doğru freelancer’lardan daha iyi teklifler getirir.</span></div></div>
    <Feedback {...params} />
    <form action={createJob} className="marketplace-form job-create-form">
      <div className="form-section-title"><span>01</span><div><h2>Proje özeti</h2><p>Freelancer’ın ilk bakışta anlayacağı kadar açık ol.</p></div></div>
      <JobProjectFields />
      <div className="form-section-title"><span>02</span><div><h2>Bütçe & takvim</h2><p>Teklif verenlerin kapsamı doğru planlamasına yardımcı olur.</p></div></div>
      <div className="form-grid three"><label>Minimum bütçe (₺)<input name="budgetMin" type="number" min="0" required /></label><label>Maksimum bütçe (₺)<input name="budgetMax" type="number" min="0" required /></label><label>Son tarih<input name="deadline" type="date" /></label></div>
      <button className="marketplace-submit" type="submit">İlanı yayınla →</button>
    </form>
  </MarketplaceShell>
}
