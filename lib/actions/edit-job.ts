'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/role'

export async function editJob(id: string, revision: string, form: FormData) {
  const { supabase, user } = await requireRole('employer')
  const title = String(form.get('title') ?? '').trim()
  const description = String(form.get('description') ?? '').trim()
  if (title.length < 5 || title.length > 140 || description.length < 20 || description.length > 5000) {
    return { error: 'Başlık 5–140, açıklama 20–5000 karakter olmalı.' }
  }
  const { data, error } = await supabase.from('jobs')
    .update({ title, description })
    .eq('id', id).eq('employer_id', user.id).in('status', ['open', 'draft', 'closed']).eq('updated_at', revision)
    .select('id').maybeSingle()
  if (error || !data) return { error: 'Kaydedilemedi. İlan değişmiş veya kapanmış olabilir. Sayfayı yenileyip tekrar dene.' }
  for (const path of ['/jobs', `/jobs/${id}`, '/employer', '/freelancer', '/freelancer/activity', `/employer/jobs/${id}/proposals`]) revalidatePath(path)
  return { success: true }
}
