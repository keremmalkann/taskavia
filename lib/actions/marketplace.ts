'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireRole, requireUser } from '@/lib/auth/role'
import { getSiteUrl } from '@/lib/site-url'
import { messageFromError, parseSkills } from '@/lib/marketplace'
import { createAdminClient } from '@/lib/supabase/admin'

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}

function go(path: string, kind: 'error' | 'message', message: string): never {
  const separator = path.includes('?') ? '&' : '?'
  redirect(`${path}${separator}${kind}=${encodeURIComponent(message)}`)
}

const portfolioTypes: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
}

function storagePathFromPublicUrl(url: string) {
  const marker = '/storage/v1/object/public/portfolios/'
  const markerIndex = url.indexOf(marker)
  if (markerIndex === -1) return null
  return decodeURIComponent(url.slice(markerIndex + marker.length))
}

export async function updateProfile(formData: FormData) {
  const { supabase, user, role } = await requireUser()
  const fullName = text(formData, 'fullName')
  const title = text(formData, 'title')
  const companyName = text(formData, 'companyName')
  const bio = text(formData, 'bio')
  const hourlyRateValue = text(formData, 'hourlyRate')
  const experienceYearsValue = text(formData, 'experienceYears')
  const hourlyRate = hourlyRateValue === '' ? null : Number(hourlyRateValue)
  const experienceYears = experienceYearsValue === '' ? null : Number(experienceYearsValue)
  const stripeAccountId = text(formData, 'stripeAccountId')

  if (fullName.length < 2) go('/profile', 'error', 'Ad soyad en az 2 karakter olmalı.')
  if (title.length > 120 || companyName.length > 160 || bio.length > 1500) go('/profile', 'error', 'Profil alanlarından biri izin verilen uzunluğu aşıyor.')
  if (hourlyRate != null && (!Number.isFinite(hourlyRate) || hourlyRate < 0)) go('/profile', 'error', 'Saatlik ücret geçerli bir sayı olmalı.')
  if (experienceYears != null && (!Number.isInteger(experienceYears) || experienceYears < 0)) go('/profile', 'error', 'Deneyim yılı sıfır veya daha büyük bir tam sayı olmalı.')

  let portfolioUrl: string | undefined
  const file = formData.get('portfolioFile')
  if (file instanceof File && file.size > 0) {
    if (file.size > 10 * 1024 * 1024) go('/profile', 'error', 'Portföy dosyası en fazla 10 MB olabilir.')
    const extension = portfolioTypes[file.type]
    if (!extension) go('/profile', 'error', 'Yalnızca JPG, PNG, WebP veya PDF yükleyebilirsin.')
    const path = `${user.id}/${crypto.randomUUID()}.${extension}`
    const { error: uploadError } = await supabase.storage.from('portfolios').upload(path, file, { contentType: file.type, upsert: false })
    if (uploadError) go('/profile', 'error', 'Portföy dosyası yüklenemedi. Storage kurulumunu kontrol et.')
    portfolioUrl = supabase.storage.from('portfolios').getPublicUrl(path).data.publicUrl
  }

  const payload: Record<string, unknown> = {
    id: user.id,
    role,
    full_name: fullName,
    title: title || null,
    company_name: companyName || null,
    bio: bio || null,
    skills: parseSkills(formData.get('skills')),
    hourly_rate: role === 'freelancer' ? hourlyRate : null,
    experience_years: role === 'freelancer' ? experienceYears : null,
    stripe_account_id: role === 'freelancer' && stripeAccountId.startsWith('acct_') ? stripeAccountId : null,
  }
  if (portfolioUrl) payload.portfolio_url = portfolioUrl

  const { error } = await supabase.from('profiles').upsert(payload)
  if (error) go('/profile', 'error', messageFromError(error, 'Profil kaydedilemedi.'))

  await supabase.auth.updateUser({ data: { full_name: fullName, role } })
  revalidatePath('/profile')
  go('/profile', 'message', 'Profilin başarıyla güncellendi.')
}

export async function createPortfolioItem(formData: FormData) {
  const { supabase, user } = await requireRole('freelancer')
  const title = text(formData, 'title')
  const description = text(formData, 'description')
  const file = formData.get('file')

  if (title.length < 2 || title.length > 100) go('/profile', 'error', 'Portföy başlığı 2–100 karakter olmalı.')
  if (description.length > 1500) go('/profile', 'error', 'Portföy açıklaması en fazla 1500 karakter olabilir.')
  if (!(file instanceof File) || file.size === 0) go('/profile', 'error', 'Portföy çalışman için bir görsel veya PDF seç.')
  if (file.size > 10 * 1024 * 1024) go('/profile', 'error', 'Portföy dosyası en fazla 10 MB olabilir.')

  const extension = portfolioTypes[file.type]
  if (!extension) go('/profile', 'error', 'Yalnızca JPG, PNG, WebP veya PDF yükleyebilirsin.')

  const path = `${user.id}/works/${crypto.randomUUID()}.${extension}`
  const { error: uploadError } = await supabase.storage.from('portfolios').upload(path, file, { contentType: file.type, upsert: false })
  if (uploadError) go('/profile', 'error', 'Portföy dosyası yüklenemedi. Lütfen yeniden dene.')

  const fileUrl = supabase.storage.from('portfolios').getPublicUrl(path).data.publicUrl
  const { error: insertError } = await supabase.from('portfolio_items').insert({
    profile_id: user.id,
    title,
    description: description || null,
    file_url: fileUrl,
  })
  if (insertError) {
    await supabase.storage.from('portfolios').remove([path])
    go('/profile', 'error', messageFromError(insertError, 'Portföy çalışması kaydedilemedi.'))
  }

  revalidatePath('/profile')
  revalidatePath(`/profiles/${user.id}`)
  go('/profile', 'message', 'Portföy çalışman yayınlandı.')
}

export async function deletePortfolioItem(itemId: string) {
  const { supabase, user } = await requireRole('freelancer')
  const { data: item, error: findError } = await supabase
    .from('portfolio_items')
    .select('id, file_url')
    .eq('id', itemId)
    .eq('profile_id', user.id)
    .maybeSingle()

  if (findError || !item) go('/profile', 'error', 'Portföy çalışması bulunamadı.')

  const storagePath = item.file_url ? storagePathFromPublicUrl(item.file_url) : null
  if (storagePath) {
    const { error: storageError } = await supabase.storage.from('portfolios').remove([storagePath])
    if (storageError) go('/profile', 'error', 'Portföy dosyası silinemedi. Lütfen yeniden dene.')
  }

  const { error: deleteError } = await supabase.from('portfolio_items').delete().eq('id', item.id).eq('profile_id', user.id)
  if (deleteError) go('/profile', 'error', 'Portföy çalışması silinemedi.')

  revalidatePath('/profile')
  revalidatePath(`/profiles/${user.id}`)
  go('/profile', 'message', 'Portföy çalışması kaldırıldı.')
}

export async function uploadResume(formData: FormData) {
  const { supabase, user } = await requireRole('freelancer')
  const file = formData.get('resume')

  if (!(file instanceof File) || file.size === 0) go('/profile', 'error', 'Yüklemek için bir özgeçmiş PDF’i seç.')
  if (file.size > 5 * 1024 * 1024) go('/profile', 'error', 'Özgeçmiş dosyası en fazla 5 MB olabilir.')
  if (file.type !== 'application/pdf' || await file.slice(0, 5).text() !== '%PDF-') go('/profile', 'error', 'Özgeçmiş yalnızca geçerli bir PDF dosyası olabilir.')

  const { data: currentProfile, error: profileError } = await supabase.from('profiles').select('resume_path').eq('id', user.id).single()
  if (profileError) go('/profile', 'error', 'Özgeçmiş alanı henüz kurulmadı. Yeni Supabase migration dosyasını çalıştır.')

  const resumePath = `${user.id}/resume-${crypto.randomUUID()}.pdf`
  const { error: uploadError } = await supabase.storage.from('resumes').upload(resumePath, file, { contentType: 'application/pdf', upsert: false })
  if (uploadError) go('/profile', 'error', 'Özgeçmiş yüklenemedi. Özel dosya alanının kurulumunu kontrol et.')

  const { error: updateError } = await supabase.from('profiles').update({ resume_path: resumePath }).eq('id', user.id)
  if (updateError) {
    await supabase.storage.from('resumes').remove([resumePath])
    go('/profile', 'error', 'Özgeçmiş profilinle ilişkilendirilemedi.')
  }

  if (currentProfile.resume_path) await supabase.storage.from('resumes').remove([currentProfile.resume_path])
  revalidatePath('/profile')
  revalidatePath(`/profiles/${user.id}`)
  go('/profile', 'message', currentProfile.resume_path ? 'Özgeçmişin güncellendi.' : 'Özgeçmişin profiline eklendi.')
}

export async function deleteResume() {
  const { supabase, user } = await requireRole('freelancer')
  const { data: profile, error: profileError } = await supabase.from('profiles').select('resume_path').eq('id', user.id).single()
  if (profileError || !profile?.resume_path) go('/profile', 'error', 'Silinecek bir özgeçmiş bulunamadı.')

  const { error: updateError } = await supabase.from('profiles').update({ resume_path: null }).eq('id', user.id)
  if (updateError) go('/profile', 'error', 'Özgeçmiş profilinden kaldırılamadı.')
  await supabase.storage.from('resumes').remove([profile.resume_path])

  revalidatePath('/profile')
  revalidatePath(`/profiles/${user.id}`)
  go('/profile', 'message', 'Özgeçmişin profilinden kaldırıldı.')
}

export async function createJob(formData: FormData) {
  const { supabase, user } = await requireRole('employer')
  const title = text(formData, 'title')
  const description = text(formData, 'description')
  const category = text(formData, 'category')
  const budgetMin = Number(text(formData, 'budgetMin'))
  const budgetMax = Number(text(formData, 'budgetMax'))

  if (title.length < 5 || description.length < 20 || !category || budgetMin < 0 || budgetMax < budgetMin) {
    go('/employer/jobs/new', 'error', 'İlan bilgilerini ve bütçe aralığını kontrol et.')
  }

  const { data, error } = await supabase.from('jobs').insert({
    employer_id: user.id,
    title,
    description,
    category,
    skills: parseSkills(formData.get('skills')),
    budget_min: budgetMin,
    budget_max: budgetMax,
    deadline: text(formData, 'deadline') || null,
  }).select('id').single()

  if (error) go('/employer/jobs/new', 'error', messageFromError(error, 'İlan yayınlanamadı.'))
  revalidatePath('/employer')
  redirect(`/jobs/${data.id}?message=${encodeURIComponent('İlanın yayında. Teklifleri bu sayfadan takip edebilirsin.')}`)
}

export async function createProposal(jobId: string, formData: FormData) {
  const { supabase, user } = await requireRole('freelancer')
  const price = Number(text(formData, 'price'))
  const durationDays = Number(text(formData, 'durationDays'))
  const message = text(formData, 'message')

  if (price <= 0 || durationDays <= 0 || message.length < 10) go(`/jobs/${jobId}`, 'error', 'Teklif tutarı, süre ve mesaj alanlarını kontrol et.')

  const { error } = await supabase.from('proposals').insert({ job_id: jobId, freelancer_id: user.id, price, duration_days: durationDays, message })
  if (error) go(`/jobs/${jobId}`, 'error', messageFromError(error, 'Teklif gönderilemedi.'))
  revalidatePath(`/jobs/${jobId}`)
  revalidatePath('/freelancer')
  go(`/jobs/${jobId}`, 'message', 'Teklifin işverene gönderildi.')
}

export async function acceptProposal(jobId: string, proposalId: string) {
  const { supabase } = await requireRole('employer')
  const { error } = await supabase.rpc('accept_proposal', { target_proposal_id: proposalId })
  const comparisonPath = `/employer/jobs/${jobId}/proposals`
  if (error) go(comparisonPath, 'error', messageFromError(error, 'Teklif kabul edilemedi.'))
  revalidatePath(`/jobs/${jobId}`)
  revalidatePath(comparisonPath)
  revalidatePath('/employer')
  go(comparisonPath, 'message', 'Teklif kabul edildi. Mesajlaşma artık açık.')
}

export async function completeJob(jobId: string) {
  const { supabase } = await requireRole('employer')
  const { error } = await supabase.rpc('complete_job', { target_job_id: jobId })
  if (error) go(`/jobs/${jobId}`, 'error', 'İş tamamlandı olarak işaretlenemedi.')
  revalidatePath(`/jobs/${jobId}`)
  go(`/jobs/${jobId}`, 'message', 'İş tamamlandı. Taraflar artık değerlendirme bırakabilir.')
}

export async function sendMessage(proposalId: string, formData: FormData) {
  const { supabase, user } = await requireUser()
  const body = text(formData, 'body')
  if (!body) go(`/messages/${proposalId}`, 'error', 'Mesaj boş olamaz.')
  const { error } = await supabase.from('messages').insert({ proposal_id: proposalId, sender_id: user.id, body })
  if (error) go(`/messages/${proposalId}`, 'error', messageFromError(error, 'Mesaj gönderilemedi.'))
  revalidatePath(`/messages/${proposalId}`)
  redirect(`/messages/${proposalId}`)
}

export async function createReview(jobId: string, revieweeId: string, formData: FormData) {
  const { supabase, user } = await requireUser()
  const rating = Number(text(formData, 'rating'))
  const comment = text(formData, 'comment')
  const reviewPath = `/reviews/new?job=${encodeURIComponent(jobId)}&to=${encodeURIComponent(revieweeId)}`
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) go(reviewPath, 'error', '1 ile 5 arasında bir puan seç.')
  const { error } = await supabase.from('reviews').insert({ job_id: jobId, reviewer_id: user.id, reviewee_id: revieweeId, rating, comment: comment || null })
  if (error) go(reviewPath, 'error', messageFromError(error, 'Değerlendirme kaydedilemedi.'))
  revalidatePath('/profile')
  revalidatePath(`/profiles/${revieweeId}`)
  go(reviewPath, 'message', 'Değerlendirmen yayınlandı.')
}

export async function startCheckout(proposalId: string) {
  const { supabase, user } = await requireRole('employer')
  const secret = process.env.STRIPE_SECRET_KEY
  if (!secret) go(`/messages/${proposalId}`, 'error', 'Stripe Connect henüz etkinleştirilmedi.')

  const { data: proposal } = await supabase
    .from('proposals')
    .select('id, price, status, freelancer_id, jobs!inner(id, title, employer_id), profiles!proposals_freelancer_id_fkey(stripe_account_id)')
    .eq('id', proposalId)
    .single()

  const job = Array.isArray(proposal?.jobs) ? proposal?.jobs[0] : proposal?.jobs
  const freelancer = Array.isArray(proposal?.profiles) ? proposal?.profiles[0] : proposal?.profiles
  if (!proposal || proposal.status !== 'accepted' || job?.employer_id !== user.id) go(`/messages/${proposalId}`, 'error', 'Bu teklif için ödeme başlatılamaz.')
  if (!freelancer?.stripe_account_id) go(`/messages/${proposalId}`, 'error', 'Freelancer Stripe Connect hesabını henüz bağlamadı.')

  const amount = Math.round(Number(proposal.price) * 100)
  const params = new URLSearchParams({
    mode: 'payment',
    success_url: `${getSiteUrl()}/messages/${proposalId}?message=${encodeURIComponent('Ödeme alındı. Durum webhook ile güncellenecek.')}`,
    cancel_url: `${getSiteUrl()}/messages/${proposalId}?error=${encodeURIComponent('Ödeme işlemi iptal edildi.')}`,
    'line_items[0][price_data][currency]': 'try',
    'line_items[0][price_data][unit_amount]': String(amount),
    'line_items[0][price_data][product_data][name]': String(job.title),
    'line_items[0][quantity]': '1',
    'payment_intent_data[transfer_group]': `proposal_${proposalId}`,
    'metadata[proposal_id]': proposalId,
  })

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  })
  const session = await response.json() as { url?: string }
  if (!response.ok || !session.url) go(`/messages/${proposalId}`, 'error', 'Ödeme oturumu oluşturulamadı.')
  redirect(session.url)
}

export async function releasePayment(proposalId: string) {
  const { supabase, user } = await requireRole('employer')
  const secret = process.env.STRIPE_SECRET_KEY
  const admin = createAdminClient()
  if (!secret || !admin) go(`/messages/${proposalId}`, 'error', 'Stripe ödeme yönetimi henüz etkinleştirilmedi.')

  const { data: payment } = await supabase
    .from('payments')
    .select('id, amount, platform_fee, status, freelancer_id, proposals!inner(job_id, jobs!inner(status, employer_id)), profiles!payments_freelancer_id_fkey(stripe_account_id)')
    .eq('proposal_id', proposalId)
    .single()
  const proposal = Array.isArray(payment?.proposals) ? payment.proposals[0] : payment?.proposals
  const job = Array.isArray(proposal?.jobs) ? proposal.jobs[0] : proposal?.jobs
  const freelancer = Array.isArray(payment?.profiles) ? payment.profiles[0] : payment?.profiles
  if (!payment || payment.status !== 'funded' || job?.status !== 'completed' || job?.employer_id !== user.id) {
    go(`/messages/${proposalId}`, 'error', 'Ödeme yalnızca tamamlanmış işte serbest bırakılabilir.')
  }
  if (!freelancer?.stripe_account_id) go(`/messages/${proposalId}`, 'error', 'Freelancer ödeme hesabını bağlamadı.')

  const transferAmount = Math.round((Number(payment.amount) - Number(payment.platform_fee)) * 100)
  const params = new URLSearchParams({ amount: String(transferAmount), currency: 'try', destination: freelancer.stripe_account_id, transfer_group: `proposal_${proposalId}` })
  const response = await fetch('https://api.stripe.com/v1/transfers', {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  })
  const transfer = await response.json() as { id?: string }
  if (!response.ok || !transfer.id) go(`/messages/${proposalId}`, 'error', 'Ödeme freelancer hesabına aktarılamadı.')
  await admin.from('payments').update({ status: 'released', stripe_transfer_id: transfer.id }).eq('id', payment.id)
  revalidatePath(`/messages/${proposalId}`)
  go(`/messages/${proposalId}`, 'message', 'Ödeme freelancer hesabına aktarıldı.')
}
