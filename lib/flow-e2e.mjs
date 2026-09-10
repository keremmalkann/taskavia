// Uçtan uca akış testi (canlı Supabase, RLS + RPC katmanı)
//
// Çalıştırma (yalnızca izole test Supabase projesinde):
// TASKAVIA_E2E_ALLOW_REMOTE_WRITE=true TASKAVIA_E2E_PROJECT_REF=<test-project-ref> npm run test:e2e
//
// Kayıt → ilan → teklif → kabul → mesajlaşma → tamamlama → değerlendirme
// zincirini gerçek REST çağrılarıyla doğrular ve yetki boşluklarını (F1/F2)
// ile migration durumunu (F5) raporlar. Her çalıştırmada benzersiz kullanıcılar
// oluşturur ve işlem sonunda bunları ilişkili test verileriyle birlikte siler.

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const allowRemoteWrite = process.env.TASKAVIA_E2E_ALLOW_REMOTE_WRITE === 'true'
const expectedProjectRef = process.env.TASKAVIA_E2E_PROJECT_REF?.trim()

if (!allowRemoteWrite) {
  console.error('Güvenlik kilidi: Bu test uzak Supabase projesine kalıcı veri yazar.')
  console.error('Yalnızca izole test projesinde TASKAVIA_E2E_ALLOW_REMOTE_WRITE=true ile çalıştır.')
  process.exit(1)
}

if (!url || !anonKey || !serviceRoleKey) {
  console.error('NEXT_PUBLIC_SUPABASE_URL, ANON_KEY veya SUPABASE_SERVICE_ROLE_KEY bulunamadı.')
  process.exit(1)
}

const projectRef = new URL(url).hostname.split('.')[0]
if (!expectedProjectRef || expectedProjectRef !== projectRef) {
  console.error('Güvenlik kilidi: TASKAVIA_E2E_PROJECT_REF, hedef Supabase project ref ile birebir eşleşmeli.')
  console.error(`Hedef project ref: ${projectRef}`)
  process.exit(1)
}

const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
const createdUsers = []
const ts = `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`
const password = `Taskavia-${crypto.randomUUID()}!Aa1`
const emails = {
  employer: `taskavia-flow-${ts}-e@example.com`,
  freelancer: `taskavia-flow-${ts}-f@example.com`,
  outsider: `taskavia-flow-${ts}-o@example.com`,
}

const results = []
function record(name, kind, detail = '') {
  results.push({ name, kind, detail })
  const icon = kind === 'pass' ? 'PASS' : kind === 'fail' ? 'FAIL' : kind === 'hole' ? 'HOLE' : kind === 'skip' ? 'SKIP' : 'INFO'
  console.log(`${icon.padEnd(5)} ${name}${detail ? ` — ${detail}` : ''}`)
}

async function attempt(label, fn, expectError = false) {
  try {
    const out = await fn()
    if (expectError) record(label, 'fail', 'hata bekleniyordu, işlem başarılı oldu')
    return { ok: true, ...out }
  } catch (err) {
    if (expectError) return { ok: false, error: err }
    record(label, 'fail', `${err?.message ?? err}`.slice(0, 200))
    throw err
  }
}

function withTimeout(promise, ms = 20000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('zaman aşımı')), ms)),
  ])
}

async function createTestSession(email, role) {
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `E2E ${role} ${ts}`, role },
  })
  if (createError || !created.user) throw createError ?? new Error('test kullanıcısı oluşturulamadı')
  createdUsers.push({ id: created.user.id, email })

  const authClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await authClient.auth.signInWithPassword({ email, password })
  if (error || !data.session) throw error ?? new Error('test oturumu alınamadı')
  return data
}

try {
  record('Adım 1: kayıt (işveren + freelancer + dış gözlemci)', 'info')
  const sessions = {}
  for (const [name, email] of Object.entries(emails)) {
    const role = name === 'employer' ? 'employer' : 'freelancer'
    const data = await withTimeout(createTestSession(email, role))
    sessions[name] = data.session
    record(`kayıt ${name}`, 'pass', email)
  }

  const clients = {}
  for (const name of Object.keys(sessions)) clients[name] = createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${sessions[name].access_token}` } } })
  const { employer: E, freelancer: F, outsider: O } = clients

  await attempt('Adım 2: profil otomatik oluştu + rol doğru', async () => {
    for (const [name, role] of [['employer', 'employer'], ['freelancer', 'freelancer'], ['outsider', 'freelancer']]) {
      const { data, error } = await clients[name].from('profiles').select('id, role').eq('id', sessions[name].user.id).maybeSingle()
      if (error) throw error
      if (data?.role !== role) throw new Error(`${name}: beklenen rol ${role}, gelen ${data?.role}`)
    }
    record('Adım 2: profil otomatik oluştu + rol doğru', 'pass')
  })

  // --- İlan ---
  const jobInsert = { title: `E2E akış testi ilanı ${ts}`, description: 'Uçtan uca akış testi için oluşturulmuş ilandır. Kapsam ve teslimat aşamaları otomatik doğrulanır.', category: 'Yazılım', skills: ['javascript', 'node'], budget_min: 1000, budget_max: 3000, deadline: '2026-12-31' }
  const { data: job, error: jobErr } = await E.from('jobs').insert(jobInsert).select('id, status').single()
  if (jobErr) throw jobErr
  record('Adım 3: işveren ilan açtı (status=open)', 'pass', job.id)

  const oJob = await O.from('jobs').insert(jobInsert).select('id').maybeSingle()
  if (!oJob.error) record('Adım 3b: freelancer ilan açabildi (yetki hatası!)', 'fail')
  else record('Adım 3b: freelancer ilan açamıyor', 'pass')

  // --- Teklif ---
  const { data: proposal, error: pErr } = await F.from('proposals').insert({ job_id: job.id, freelancer_id: sessions.freelancer.user.id, price: 1500, duration_days: 10, message: 'Projeyi inceledim, deneyimim uygun. Detayları mesajlaşmada konuşabiliriz.' }).select('id, status, updated_at').single()
  if (pErr) throw pErr
  record('Adım 4: freelancer teklif gönderdi (status=pending)', 'pass', proposal.id)

  const dup = await F.from('proposals').insert({ job_id: job.id, freelancer_id: sessions.freelancer.user.id, price: 1500, duration_days: 10, message: 'Aynı ilana ikinci bir teklif daha gönderiyorum.' }).select('id').maybeSingle()
  if (!dup.error) record('Adım 4b: mükerrer teklif engellenmedi (veri hatası!)', 'fail')
  else record('Adım 4b: mükerrer teklif unique ile engellendi', 'pass', dup.error.code)

  const { data: outsiderProposal, error: opErr } = await O.from('proposals').insert({ job_id: job.id, freelancer_id: sessions.outsider.user.id, price: 2000, duration_days: 15, message: 'Ben de bu projeye talibim, referanslarım mevcut.' }).select('id, status, updated_at').single()
  if (opErr) throw opErr
  record('Adım 4c: ikinci freelancer teklifi', 'pass', outsiderProposal.id)

  // --- Yetki boşluğu probları (ayrı J2/Px satırlarında; ana zinciri kirletmez) ---
  const { data: probeJob } = await E.from('jobs').insert({ ...jobInsert, title: `Probe ilanı ${ts}` }).select('id').single()
  const { data: probeProposal } = await F.from('proposals').insert({ job_id: probeJob.id, freelancer_id: sessions.freelancer.user.id, price: 1200, duration_days: 7, message: 'Probe teklifidir, karar akışı test edilir.' }).select('id, updated_at').single()

  const directReject = await E.from('proposals').update({ status: 'accepted' }).eq('id', probeProposal.id).eq('job_id', probeJob.id).select('id').maybeSingle()
  if (!directReject.error && directReject.data) record('Adım 5: F1 doğrulaması — işveren REST ile teklifi RPC olmadan kabul edebildi', 'hole', '20260909000000 migration uygulanınca kapanır')
  else record('Adım 5: F1 doğrulaması — doğrudan teklif güncellemesi engellendi', 'pass')

  const directFlip = await E.from('jobs').update({ status: 'assigned' }).eq('id', probeJob.id).eq('employer_id', sessions.employer.user.id).select('id').maybeSingle()
  if (!directFlip.error && directFlip.data) record('Adım 5b: F2 doğrulaması — işveren REST ile ilanı assigned yapabildi', 'hole', '20260909000000 migration uygulanınca kapanır')
  else record('Adım 5b: F2 doğrulaması — doğrudan ilan durum değişimi engellendi', 'pass')

  const fWithdraw = await F.from('proposals').update({ status: 'withdrawn' }).eq('id', probeProposal.id).eq('freelancer_id', sessions.freelancer.user.id).select('id').maybeSingle()
  if (!fWithdraw.error && fWithdraw.data) record('Adım 5c: freelancer doğrudan geri çekebildi', 'hole', '20260904150000 migration uygulanınca kapanır')
  else record('Adım 5c: freelancer doğrudan geri çekemiyor', 'pass')

  const occProbe = await E.from('jobs').update({ title: 'OCC ile değişmeli' }).eq('id', probeJob.id).eq('updated_at', '2000-01-01T00:00:00Z').select('id').maybeSingle()
  if (!occProbe.error && occProbe.data) record('Adım 5d: OCC revizyonu yok sayıldı (veri hatası!)', 'fail')
  else record('Adım 5d: OCC revizyon kontrolü çalışıyor', 'pass')

  // --- İlan yönetimi: taslak / kapatma / yeniden yayınlama / silme (20260909120000) ---
  const mgmt = { title: `Yonetim testi ilani ${ts}`, description: 'Taslak, kapatma, yeniden yayınlama ve silme akışlarını doğrulamak için oluşturulmuş ilandır. Kapsam otomatik test kapsamında tutulur.', category: 'Yazılım', skills: ['testing'], budget_min: 500, budget_max: 1500, deadline: '2026-12-31' }
  const { data: draftJob, error: draftErr } = await E.from('jobs').insert({ ...mgmt, status: 'draft' }).select('id, status, updated_at').single()
  if (draftErr || draftJob.status !== 'draft') record('Adım 5e: taslak ilan oluşturuldu', 'fail', draftErr?.message ?? draftJob?.status)
  else record('Adım 5e: taslak ilan oluşturuldu (yalnızca işveren görür)', 'pass')

  const outsiderSeesDraft = await O.from('jobs').select('id').eq('id', draftJob.id).maybeSingle()
  if (outsiderSeesDraft.data) record('Adım 5f: taslak dışarıya görünür (yetki hatası!)', 'fail')
  else record('Adım 5f: taslak diğer kullanıcılara görünmüyor', 'pass')

  const draftProposal = await F.from('proposals').insert({ job_id: draftJob.id, freelancer_id: sessions.freelancer.user.id, price: 900, duration_days: 5, message: 'Taslak ilana teklif denemesi yapıyorum.' }).select('id').maybeSingle()
  if (!draftProposal.error) record('Adım 5g: taslak ilana teklif gönderilebildi (yetki hatası!)', 'fail')
  else record('Adım 5g: taslak ilana teklif gönderilemiyor', 'pass')

  const publishFirst = await E.rpc('publish_job', { target_job_id: draftJob.id, expected_updated_at: draftJob.updated_at })
  if (publishFirst.error) record('Adım 5h: taslak yayınlandı (publish_job)', 'fail', publishFirst.error.message.includes('PGRST202') ? 'migration 20260909120000 uygulanmamış' : publishFirst.error.message)
  else record('Adım 5h: taslak yayınlandı (publish_job)', 'pass')

  const publishStale = await E.rpc('publish_job', { target_job_id: draftJob.id, expected_updated_at: draftJob.updated_at })
  if (!publishStale.error) record('Adım 5i: publish_job OCC koruması yok (veri hatası!)', 'fail')
  else record('Adım 5i: publish_job eski revizyonu reddediyor (OCC)', 'pass')

  const { data: mgmtProposal } = await F.from('proposals').insert({ job_id: draftJob.id, freelancer_id: sessions.freelancer.user.id, price: 900, duration_days: 5, message: 'Yayınlanan yönetim ilanına ilk teklifim.' }).select('id, updated_at').single()
  const closeFirst = await E.rpc('close_job', { target_job_id: draftJob.id, expected_updated_at: (await E.from('jobs').select('updated_at').eq('id', draftJob.id).single()).data.updated_at })
  if (closeFirst.error) record('Adım 5j: ilan kapatıldı (close_job)', 'fail', closeFirst.error.message.includes('PGRST202') ? 'migration 20260909120000 uygulanmamış' : closeFirst.error.message)
  else record('Adım 5j: ilan kapatıldı (close_job)', 'pass')

  const { data: closedJob } = await E.from('jobs').select('status').eq('id', draftJob.id).single()
  const { data: closedProposals } = await E.from('proposals').select('status').eq('job_id', draftJob.id).eq('id', mgmtProposal.id).single()
  if (closedJob?.status !== 'closed' || closedProposals?.status !== 'rejected') record('Adım 5k: kapatmada ilan closed / teklif rejected olmadı (veri hatası!)', 'fail', `${closedJob?.status}/${closedProposals?.status}`)
  else record('Adım 5k: kapatmada ilan closed, bekleyen teklif reddedildi', 'pass')

  const outsiderSeesClosed = await O.from('jobs').select('id').eq('id', draftJob.id).maybeSingle()
  if (!outsiderSeesClosed.data) record('Adım 5l: kapatılan ilan dışarıya görünmüyor', 'info', 'görüşme gerektirir; kapatılan ilanın herkese açık olması tercih edilen davranış')
  else record('Adım 5l: kapatılan ilan görüntülenebilir (teklif verilemez)', 'pass')

  const reopenFirst = await E.rpc('reopen_job', { target_job_id: draftJob.id, expected_updated_at: (await E.from('jobs').select('updated_at').eq('id', draftJob.id).single()).data.updated_at })
  if (reopenFirst.error) record('Adım 5m: ilan yeniden yayınlandı (reopen_job)', 'fail', reopenFirst.error.message)
  else record('Adım 5m: ilan yeniden yayınlandı (reopen_job)', 'pass')

  const retryProposal = await F.from('proposals').insert({ job_id: draftJob.id, freelancer_id: sessions.freelancer.user.id, price: 1200, duration_days: 6, message: 'İlan yeniden açıldı, reddedilen teklifim yerine yeni teklifim.' }).select('id').maybeSingle()
  if (retryProposal.error) record('Adım 5n: reddedilen teklif sahibi yeniden teklif veremedi', 'info', 'kısmi unique yoksa eski kısıt devrede; migration ile beklenen davranış: tekrar teklif verilebilir')
  else record('Adım 5n: reddedilen teklif sahibi yeniden teklif verebiliyor', 'pass')

  const delActive = await E.from('jobs').delete().eq('id', draftJob.id).select('id').maybeSingle()
  if (delActive.data) record('Adım 5o: açık ilan kalıcı silinebildi (veri kaybı riski!)', 'fail')
  else record('Adım 5o: açık ilan kalıcı silinemiyor', 'pass')

  const { data: beforeArchive } = await E.from('jobs').select('updated_at').eq('id', draftJob.id).single()
  const archiveResult = await E.rpc('archive_job', { target_job_id: draftJob.id, expected_updated_at: beforeArchive.updated_at })
  if (archiveResult.error) record('Adım 5p: açık ilan güvenli arşivlendi', 'fail', archiveResult.error.message.includes('PGRST202') ? 'migration 20260910150000 uygulanmamış' : archiveResult.error.message)
  else {
    const [{ data: archivedJob }, { data: archivedProposal }] = await Promise.all([
      E.from('jobs').select('status, updated_at').eq('id', draftJob.id).single(),
      E.from('proposals').select('status').eq('id', retryProposal.data?.id).maybeSingle(),
    ])
    if (archivedJob?.status !== 'archived' || (retryProposal.data && archivedProposal?.status !== 'rejected')) record('Adım 5p: arşiv durumu veya teklif sonucu hatalı', 'fail', `${archivedJob?.status}/${archivedProposal?.status}`)
    else record('Adım 5p: ilan arşivlendi, bekleyen teklif reddedildi', 'pass')

    const hiddenArchive = await O.from('jobs').select('id').eq('id', draftJob.id).maybeSingle()
    if (hiddenArchive.data) record('Adım 5q: arşiv ilanı diğer kullanıcılara görünüyor', 'fail')
    else record('Adım 5q: arşiv ilanı listelerden gizlendi', 'pass')

    const restoreResult = await E.rpc('restore_archived_job', { target_job_id: draftJob.id, expected_updated_at: archivedJob.updated_at })
    if (restoreResult.error) record('Adım 5r: arşivden geri alma', 'fail', restoreResult.error.message)
    else record('Adım 5r: ilan arşivden tekliflere kapalı olarak geri alındı', 'pass')
  }

  const { data: disposableDraft } = await E.from('jobs').insert({ ...mgmt, title: `Silinebilir taslak ${ts}`, status: 'draft' }).select('id').single()
  const draftDelete = await E.from('jobs').delete().eq('id', disposableDraft.id).select('id').maybeSingle()
  if (!draftDelete.data) record('Adım 5s: taslak kalıcı silinemedi', 'fail')
  else record('Adım 5s: yalnızca taslak kalıcı silinebiliyor', 'pass')

  const outsiderDelete = await O.from('jobs').delete().eq('id', probeJob.id).select('id').maybeSingle()
  if (outsiderDelete.data) record('Adım 5t: başka işverenin ilanı silinebildi (yetki hatası!)', 'fail')
  else record('Adım 5t: başka işverenin ilanı silinemiyor', 'pass')

  // --- RPC tabanlı akış: düzenleme / geri çekme / kabul ---
  const editRpc = await O.rpc('change_pending_proposal', { target_proposal_id: outsiderProposal.id, expected_updated_at: outsiderProposal.updated_at, operation: 'edit', new_price: 1900, new_duration: 12, new_message: 'Güncellenmiş teklif: fiyat ve süre revize edildi.' })
  if (editRpc.error) record('Adım 6: teklif düzenleme RPC cagrisi', 'fail', editRpc.error.message.includes('PGRST202') ? 'migration 20260904150000 uygulanmamış (fonksiyon yok)' : editRpc.error.message)
  else record('Adım 6: teklif düzenleme RPC\'si çalışıyor', 'pass')

  const acceptRpc = await E.rpc('accept_proposal_checked', { target_proposal_id: proposal.id, expected_updated_at: proposal.updated_at })
  let acceptedVia = 'accept_proposal_checked'
  if (acceptRpc.error) {
    record('Adım 7: kabul (OCC kontrollü)', 'fail', acceptRpc.error.message.includes('PGRST202') ? 'migration 20260904150000 uygulanmamış — legacy kabul deneniyor' : acceptRpc.error.message)
    const legacy = await E.rpc('accept_proposal', { target_proposal_id: proposal.id })
    if (legacy.error) throw legacy.error
    acceptedVia = 'accept_proposal (legacy, OCC yok)'
  }
  record('Adım 7: kabul edildi', 'pass', acceptedVia)

  const { data: jobAfter } = await E.from('jobs').select('status').eq('id', job.id).single()
  if (jobAfter?.status !== 'assigned') record('Adım 7b: ilan assigned olmadı (veri hatası!)', 'fail', jobAfter?.status)
  else record('Adım 7b: ilan assigned oldu', 'pass')

  const { data: others } = await E.from('proposals').select('id, status').eq('job_id', job.id).neq('id', proposal.id)
  const atomicOk = others?.every((p) => p.status === 'rejected' || p.status === 'withdrawn')
  if (!atomicOk) record('Adım 7c: diğer teklifler reddedilmedi (veri hatası!)', 'fail', JSON.stringify(others))
  else record('Adım 7c: diğer teklifler atomik reddedildi', 'pass', others.map((p) => p.status).join(','))

  // --- Mesajlaşma ---
  const { data: msg1, error: m1Err } = await E.from('messages').insert({ proposal_id: proposal.id, sender_id: sessions.employer.user.id, body: 'Teklifin kabul edildi, hoş geldin. Başlangıç adımlarını konuşalım.' }).select('id').single()
  if (m1Err) throw m1Err
  record('Adım 8: işveren mesaj gönderdi', 'pass', msg1.id)

  const { data: fSees } = await F.from('messages').select('id').eq('proposal_id', proposal.id)
  if (!fSees?.length) record('Adım 8b: freelancer mesajı göremiyor (veri hatası!)', 'fail')
  else record('Adım 8b: freelancer mesajı görüyor (katılımcı RLS)', 'pass')

  const { data: oSees } = await O.from('messages').select('id').eq('proposal_id', proposal.id)
  if (oSees?.length) record('Adım 8c: katılımcı olmayan mesajları görebiliyor (yetki hatası!)', 'fail')
  else record('Adım 8c: katılımcı olmayan mesajları göremiyor', 'pass')

  const oSend = await O.from('messages').insert({ proposal_id: proposal.id, sender_id: sessions.outsider.user.id, body: 'Ben de bu işe talibim.' }).select('id').maybeSingle()
  if (!oSend.error) record('Adım 8d: katılımcı olmayan mesaj gönderebildi (yetki hatası!)', 'fail')
  else record('Adım 8d: katılımcı olmayan mesaj gönderemiyor', 'pass')

  // --- Tamamlama ---
  const fComplete = await F.rpc('complete_job', { target_job_id: job.id })
  if (!fComplete.error) record('Adım 9: freelancer işi tamamlayabildi (yetki hatası!)', 'fail')
  else record('Adım 9: freelancer tamamlayamıyor (işveren yetkisi)', 'pass')

  const { error: cErr } = await E.rpc('complete_job', { target_job_id: job.id })
  if (cErr) throw cErr
  const { data: done } = await E.from('jobs').select('status').eq('id', job.id).single()
  if (done?.status !== 'completed') record('Adım 9b: iş completed olmadı (veri hatası!)', 'fail', done?.status)
  else record('Adım 9b: işveren işi tamamladı (status=completed)', 'pass')

  // --- Değerlendirme ---
  const { error: r1Err } = await E.from('reviews').insert({ job_id: job.id, reviewer_id: sessions.employer.user.id, reviewee_id: sessions.freelancer.user.id, rating: 5, comment: 'Zamanında ve kaliteli teslim, tekrar çalışmak isterim.' })
  if (r1Err) record('Adım 10: işveren değerlendirmesi (can_review)', 'fail', r1Err.message)
  else record('Adım 10: işveren değerlendirmesi yayınlandı', 'pass')

  const { error: r2Err } = await F.from('reviews').insert({ job_id: job.id, reviewer_id: sessions.freelancer.user.id, reviewee_id: sessions.employer.user.id, rating: 4, comment: 'İletişim ve kapsam netliği iyiydi.' })
  if (r2Err) record('Adım 10b: freelancer değerlendirmesi (can_review)', 'fail', r2Err.message)
  else record('Adım 10b: freelancer değerlendirmesi yayınlandı', 'pass')

  const dupReview = await E.from('reviews').insert({ job_id: job.id, reviewer_id: sessions.employer.user.id, reviewee_id: sessions.freelancer.user.id, rating: 3 }).select('id').maybeSingle()
  if (!dupReview.error) record('Adım 10c: mükerrer değerlendirme engellenmedi (veri hatası!)', 'fail')
  else record('Adım 10c: mükerrer değerlendirme unique ile engellendi', 'pass', dupReview.error.code)

  const outsiderReview = await O.from('reviews').insert({ job_id: job.id, reviewer_id: sessions.outsider.user.id, reviewee_id: sessions.freelancer.user.id, rating: 5 }).select('id').maybeSingle()
  if (!outsiderReview.error) record('Adım 10d: katılımcı olmayan değerlendirme yazabildi (yetki hatası!)', 'fail')
  else record('Adım 10d: katılımcı olmayan değerlendirme yazamıyor', 'pass')
} catch (err) {
  record('Test zinciri tamamlanamadı', 'fail', err?.message ?? String(err))
} finally {
  let cleanupFailed = false
  for (const testUser of [...createdUsers].reverse()) {
    const { error } = await admin.auth.admin.deleteUser(testUser.id)
    if (error) {
      cleanupFailed = true
      record(`Temizlik: ${testUser.email}`, 'fail', error.message)
    }
  }
  if (createdUsers.length && !cleanupFailed) record('Test kullanıcıları ve ilişkili veriler temizlendi', 'pass', `${createdUsers.length} kullanıcı`)

  const fails = results.filter((r) => r.kind === 'fail')
  const holes = results.filter((r) => r.kind === 'hole')
  console.log('\n=== ÖZET ===')
  console.log(`Toplam: ${results.length} | PASS: ${results.filter((r) => r.kind === 'pass').length} | FAIL: ${fails.length} | AÇIK BOŞLUK (HOLE): ${holes.length} | SKIP/INFO: ${results.filter((r) => !['pass', 'fail', 'hole'].includes(r.kind)).length}`)
  if (holes.length) {
    console.log('\nAçık yetki boşlukları (düzeltme: supabase/migrations/20260909000000_flow_integrity.sql dosyasını SQL Editor’de çalıştır):')
    for (const h of holes) console.log(`  - ${h.name}`)
  }
  if (fails.length) {
    console.log('\nBaşarısız adımlar:')
    for (const f of fails) console.log(`  - ${f.name}: ${f.detail}`)
  }
  console.log('\nNot: realtime (anlık mesaj), dosya yükleme ve UI akışları bu REST testinin kapsamı dışındadır; `npm run dev` ile tarayıcıda ayrıca doğrulanmalıdır.')
  if (fails.length || holes.length) process.exitCode = 1
}
