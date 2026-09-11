'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth/role'
import { messageFromError } from '@/lib/marketplace'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function go(path: string, kind: 'error' | 'message', message: string): never {
  redirect(`${path}?${kind}=${encodeURIComponent(message)}`)
}

export async function saveCandidateNote(jobId: string, proposalId: string, formData: FormData) {
  const path = `/employer/jobs/${jobId}/proposals`
  if (!UUID.test(jobId) || !UUID.test(proposalId)) go(path, 'error', 'Aday notu kaydedilemedi.')

  const { supabase, user } = await requireRole('employer')
  const note = String(formData.get('note') ?? '').trim()
  if (note.length > 1000) go(path, 'error', 'Aday notu en fazla 1000 karakter olabilir.')

  const { data: proposal } = await supabase
    .from('proposals')
    .select('id, jobs!inner(employer_id)')
    .eq('id', proposalId)
    .eq('job_id', jobId)
    .maybeSingle()
  const job = Array.isArray(proposal?.jobs) ? proposal.jobs[0] : proposal?.jobs
  if (!proposal || job?.employer_id !== user.id) go(path, 'error', 'Bu aday için not ekleme yetkin yok.')

  const result = note
    ? await supabase.from('proposal_notes').upsert({ proposal_id: proposalId, employer_id: user.id, note }, { onConflict: 'proposal_id' })
    : await supabase.from('proposal_notes').delete().eq('proposal_id', proposalId).eq('employer_id', user.id)

  if (result.error) go(path, 'error', messageFromError(result.error, 'Aday notu kaydedilemedi. Veritabanı migration dosyasını kontrol et.'))
  revalidatePath(path)
  go(path, 'message', note ? 'Aday notu kaydedildi.' : 'Aday notu kaldırıldı.')
}
