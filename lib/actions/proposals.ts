'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/role'
import { validateProposal } from '@/lib/proposal-validation'

export async function manageProposal(proposalId: string, revision: string, operation: 'edit' | 'withdraw', form: FormData) {
  const { supabase, user } = await requireRole('freelancer')
  if (!['edit', 'withdraw'].includes(operation)) return { error: 'Geçersiz işlem.' }
  const { data: proposal } = await supabase.from('proposals').select('job_id, status').eq('id', proposalId).eq('freelancer_id', user.id).maybeSingle()
  if (!proposal || proposal.status !== 'pending') return { error: 'Bu teklif artık değiştirilemiyor. Sayfayı yenile.' }
  const { data: job } = await supabase.from('jobs').select('status, budget_min').eq('id', proposal.job_id).maybeSingle()
  if (!job || job.status !== 'open') return { error: 'İlan artık teklif değişikliğine açık değil.' }
  const price = Number(form.get('price')), duration = Number(form.get('durationDays')), message = String(form.get('message') ?? '').trim()
  if (operation === 'edit') {
    const error = validateProposal(price, duration, message, Number(job.budget_min))
    if (error) return { error }
  }
  const { error } = await supabase.rpc('change_pending_proposal', {
    target_proposal_id: proposalId, expected_updated_at: revision, operation,
    new_price: operation === 'edit' ? price : null, new_duration: operation === 'edit' ? duration : null, new_message: operation === 'edit' ? message : null,
  })
  if (error) return { error: 'İşlem tamamlanamadı. Teklif değişmiş olabilir; sayfayı yenileyip tekrar dene.' }
  for (const path of ['/freelancer', '/freelancer/activity', '/employer', `/jobs/${proposal.job_id}`, `/employer/jobs/${proposal.job_id}/proposals`]) revalidatePath(path)
  return { success: operation === 'edit' ? 'Teklifin güncellendi.' : 'Teklifin geri çekildi.' }
}
