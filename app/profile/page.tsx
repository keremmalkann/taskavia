import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Feedback, MarketplaceShell, SetupNotice } from '@/app/marketplace-shell'
import { createPortfolioItem, deletePortfolioItem, deleteResume, updateProfile, uploadResume } from '@/lib/actions/marketplace'
import { requireUser } from '@/lib/auth/role'
import { ProfileSectionLink } from '@/app/profile-section-link'
import { getProfileCompletion } from '@/lib/profile-completion'
import { resolvePortfolioUrl } from '@/lib/portfolio-files'
import { paymentsEnabled } from '@/lib/features'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Profilim — Taskavia', description: 'Taskavia profil bilgilerini, yeteneklerini ve portföyünü yönet.' }

function isPortfolioImage(url: string | null) {
  return Boolean(url && /\.(?:jpe?g|png|webp)(?:\?|$)/i.test(url))
}

/** Dosya depolamada gerçekten var mı? true/false döner; belirsizlikte (ağ hatası vb.) null. */
async function fileReachable(url: string | null): Promise<boolean | null> {
  if (!url || !/^https?:\/\//.test(url)) return null
  try {
    const response = await fetch(url, { method: 'HEAD', cache: 'no-store', signal: AbortSignal.timeout(5000) })
    if (response.ok) return true
    if (response.status === 404 || response.status === 410) return false
    return null
  } catch {
    return null
  }
}

function truncateBio(value: string | null | undefined, max = 180) {
  const bio = String(value ?? '').trim()
  if (!bio) return null
  return bio.length > max ? `${bio.slice(0, max).trimEnd()}…` : bio
}

function ProfileAccordionSummary({ number, title, description, status }: { number: string; title: string; description: string; status: string }) {
  return <summary className="profile-accordion-summary"><span>{number}</span><div><h2>{title}</h2><p>{description}</p></div><strong>{status}</strong><i aria-hidden="true">⌄</i></summary>
}

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const params = await searchParams
  const { supabase, user, role, fullName } = await requireUser()
  const [{ data: profile, error: profileError }, { data: reviews }, { data: portfolio }, { data: resumeProfile, error: resumeError }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('reviews').select('rating, comment, created_at, reviewer:profiles!reviews_reviewer_id_fkey(full_name)').eq('reviewee_id', user.id).order('created_at', { ascending: false }).limit(5),
    supabase.from('portfolio_items').select('*').eq('profile_id', user.id).order('created_at', { ascending: false }),
    role === 'freelancer' ? supabase.from('profiles').select('resume_path').eq('id', user.id).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ])
  const { data: resumeLink } = resumeProfile?.resume_path
    ? await supabase.storage.from('resumes').createSignedUrl(resumeProfile.resume_path, 60 * 60)
    : { data: null }
  const [portfolioWithUrls, legacyPortfolioUrl] = await Promise.all([
    Promise.all((portfolio ?? []).map(async (item) => ({
      ...item,
      display_url: await resolvePortfolioUrl(supabase, item.file_url),
    }))),
    resolvePortfolioUrl(supabase, profile?.portfolio_url),
  ])

  // Özgeçmiş dosyasının depolamada gerçekten var olduğunu doğrula (imzalı bağlantı, dosya yokken de üretilir).
  const resumeFileName = resumeProfile?.resume_path?.split('/').pop()
  const { data: resumeFiles, error: resumeListError } = resumeProfile?.resume_path
    ? await supabase.storage.from('resumes').list(user.id, { search: resumeFileName ?? '', limit: 20 })
    : { data: null, error: null }
  const resumeValid = resumeProfile?.resume_path
    ? resumeListError ? undefined : (resumeFiles?.some((file) => file.name === resumeFileName) ?? false)
    : undefined

  // Portföy dosyalarının erişilebilirliğini doğrula; yalnızca kayıp olanları işaretle.
  const brokenPortfolioIds = new Set<string>()
  if (portfolioWithUrls.length) {
    await Promise.all(portfolioWithUrls.slice(0, 12).map(async (item) => {
      if (!item.display_url || (await fileReachable(item.display_url)) === false) brokenPortfolioIds.add(item.id)
    }))
  }

  const average = reviews?.length ? (reviews.reduce((sum, review) => sum + Number(review.rating), 0) / reviews.length).toFixed(1) : null
  const completion = getProfileCompletion({
    role,
    profile: profile ?? {},
    portfolioCount: portfolio?.length ?? 0,
    hasResume: Boolean(resumeProfile?.resume_path),
    resumeValid,
  })

  return (
    <MarketplaceShell name={profile?.full_name ?? fullName} role={role} active="profile">
      <div className="marketplace-page-head profile-manage-head"><div><p>HESAP & PORTFÖY</p><h1>Profilini tamamla.</h1><span>Doğru bilgiler, daha iyi eşleşmeler ve daha güçlü bir güven profili oluşturur.</span></div><div className="profile-head-actions"><Link href={`/profiles/${user.id}`}>Herkese açık profili gör →</Link><Link href={role === 'employer' ? '/employer' : '/freelancer'}>Panele dön →</Link></div></div>
      <Feedback {...params} />
      {profileError && <SetupNotice />}
      {role === 'freelancer' && resumeError && <div className="error-message">Özgeçmiş alanının kullanılabilmesi için yeni Supabase migration dosyasını çalıştır.</div>}
      <div className="profile-layout">
        <form action={updateProfile} className="marketplace-form profile-accordion-form">
          <div className="profile-form-intro"><span>PROFİL BİLGİLERİ</span><h2>Kendini doğru bilgilerle anlat.</h2><p>Düzenlemek istediğin başlığı aç; diğer bölümler çalışma alanını sade tutmak için kapalı kalır.</p></div>
          <details className="profile-accordion" id="profile-section-01">
            <ProfileAccordionSummary number="01" title="Temel bilgiler" description="Profilinde görünen kişisel veya şirket bilgilerin." status={profile?.bio ? 'Dolu' : 'Eksik bilgi var'} />
            <div className="profile-accordion-body">
              <div className="form-grid two"><label>Ad Soyad<input name="fullName" required minLength={2} defaultValue={profile?.full_name ?? fullName} /></label><label>{role === 'employer' ? 'Pozisyon' : 'Uzmanlık başlığı'}<input name="title" defaultValue={profile?.title ?? ''} placeholder={role === 'employer' ? 'Kurucu, İnsan Kaynakları…' : 'Product Designer, Frontend Developer…'} /></label></div>
              {role === 'employer' && <label>Şirket adı<input name="companyName" defaultValue={profile?.company_name ?? ''} placeholder="Şirket veya marka adı" /></label>}
              <label>Hakkında<textarea name="bio" rows={5} maxLength={1500} defaultValue={profile?.bio ?? ''} placeholder="Deneyimini, çalışma biçimini ve hedeflerini anlat." /></label>
            </div>
          </details>
          {role === 'freelancer' && <>
            <details className="profile-accordion" id="profile-section-02">
              <ProfileAccordionSummary number="02" title="Uzmanlık & ücret" description="İşverenlerin seni doğru projelerle eşleştirmesini sağlar." status={`${profile?.skills?.length ?? 0} yetenek`} />
              <div className="profile-accordion-body"><label>Yetenekler<input name="skills" defaultValue={profile?.skills?.join(', ') ?? ''} placeholder="Figma, React, Marka Stratejisi (virgülle ayır)" /></label><div className="form-grid two"><label>Saatlik ücret (₺)<input name="hourlyRate" type="number" min="0" step="1" defaultValue={profile?.hourly_rate ?? ''} /></label><label>Deneyim (yıl)<input name="experienceYears" type="number" min="0" step="1" defaultValue={profile?.experience_years ?? ''} /></label></div></div>
            </details>
            {paymentsEnabled && <details className="profile-accordion" id="profile-section-03">
              <ProfileAccordionSummary number="03" title="Ödeme bilgisi" description="Kabul edilen işler için ödeme hesabını bağla." status={profile?.stripe_account_id ? 'Bağlı' : 'Bağlı değil'} />
              <div className="profile-accordion-body"><label>Stripe Connect hesap kimliği<input name="stripeAccountId" defaultValue={profile?.stripe_account_id ?? ''} placeholder="acct_..." /></label></div>
            </details>}
          </>}
          <button className="marketplace-submit profile-save" type="submit">Profili kaydet →</button>
        </form>
        <aside className="profile-preview">
          <div className="profile-preview-top"><span className="profile-preview-label">PROFİL ÖNİZLEMESİ</span><strong>{completion.percent}% tamamlandı</strong></div>
          <div className="profile-completion"><i style={{ width: `${completion.percent}%` }} /></div>
          <div className="profile-large-avatar">{(profile?.full_name ?? fullName).slice(0, 2).toLocaleUpperCase('tr-TR')}</div><h2>{profile?.full_name ?? fullName}</h2><p>{profile?.title ?? (role === 'employer' ? 'İşveren' : 'Freelancer')}</p>
          {role === 'employer' && profile?.company_name && <div className="profile-company-name">{profile.company_name}</div>}
          {truncateBio(profile?.bio) && <p className="profile-preview-bio">{truncateBio(profile?.bio)}</p>}
          {role === 'freelancer' && profile?.skills?.length ? <div className="profile-preview-skills">{profile.skills.slice(0, 6).map((skill: string) => <span key={skill}>{skill}</span>)}{profile.skills.length > 6 && <span>+{profile.skills.length - 6}</span>}</div> : null}
          {role === 'freelancer' && <div className="profile-mini-stats"><div><strong>{profile?.experience_years ?? 0}</strong><span>yıl deneyim</span></div><div><strong>{profile?.hourly_rate != null ? `₺${profile.hourly_rate}` : '—'}</strong><span>saatlik</span></div><div><strong>{average ?? 'Yeni'}</strong><span>puan</span></div></div>}
          {legacyPortfolioUrl && <a className="profile-file-link" href={legacyPortfolioUrl} target="_blank" rel="noreferrer">Önceki portföy dosyasını aç ↗</a>}
          {role === 'freelancer' && <div className="profile-portfolio-count">{portfolio?.length ?? 0} portföy çalışması</div>}
          {completion.missing.length ? <div className="profile-checklist"><span className="profile-checklist-label">TAMAMLANACAKLAR</span><ul>{completion.missing.map((item) => <li key={item.key}><ProfileSectionLink sectionId={item.sectionId}><span><strong>{item.title}</strong><em>{item.hint}</em></span><b>Tamamla →</b></ProfileSectionLink></li>)}</ul></div> : <div className="profile-checklist complete"><strong>Profilin tamamlandı.</strong><p>Herkese açık profilin güçlü görünüyor.</p></div>}
          <div className="profile-review-list"><h3>Son değerlendirmeler</h3>{reviews?.length ? reviews.map((review, index) => <article key={index}><strong>{'★'.repeat(review.rating)}</strong><p>{review.comment || 'Yorum bırakılmadı.'}</p></article>) : <p>Henüz değerlendirme yok.</p>}</div>
        </aside>
      </div>

      {role === 'freelancer' && <details className="profile-manager-accordion resume-manager" id="profile-section-04">
        <ProfileAccordionSummary number="04" title="Özgeçmiş" description="Deneyimini tek dosyada paylaş ve güncel tut." status={resumeValid === false ? 'Dosya kayıp' : (resumeProfile?.resume_path ? 'PDF yüklendi' : 'Henüz eklenmedi')} />
        <div className="profile-manager-accordion-body"><div className="resume-manager-grid">
          <article className={`resume-status-card ${resumeProfile?.resume_path && resumeValid !== false ? 'ready' : ''} ${resumeValid === false ? 'stale' : ''}`}>
            <div className="resume-document-icon">PDF</div>
            <div><span>{resumeValid === false ? 'DOSYA BULUNAMADI' : (resumeProfile?.resume_path ? 'ÖZGEÇMİŞ HAZIR' : 'ÖZGEÇMİŞ EKSİK')}</span><h3>{resumeValid === false ? 'Dosya kayıp, yeniden yükle' : (resumeProfile?.resume_path ? 'İşverenlerle paylaşılmaya hazır' : 'Profilini daha güçlü hale getir')}</h3><p>{resumeValid === false ? 'Depolamadaki özgeçmiş dosyası silinmiş görünüyor. Sağdaki alandan yeni bir PDF yükleyerek profili düzelt.' : 'PDF dosyan özel olarak saklanır. Yalnızca sen ve giriş yapmış işverenler süreli bağlantıyla görüntüleyebilir.'}</p></div>
            {resumeLink?.signedUrl && resumeValid !== false && <a href={resumeLink.signedUrl} target="_blank" rel="noreferrer">Özgeçmişi görüntüle ↗</a>}
            {resumeProfile?.resume_path && <details><summary>Özgeçmişi kaldır</summary><form action={deleteResume}><p>Dosya özel depolamadan kalıcı olarak silinecek.</p><button type="submit">Silme işlemini onayla</button></form></details>}
          </article>
          <form action={uploadResume} className="resume-upload-form">
            <span>{resumeProfile?.resume_path ? 'DOSYAYI DEĞİŞTİR' : 'DOSYA EKLE'}</span><h3>{resumeProfile?.resume_path ? 'Yeni özgeçmiş yükle' : 'Özgeçmişini yükle'}</h3><p>Güncel deneyim, eğitim ve iletişim bilgilerini içeren PDF dosyanı seç.</p>
            <label>Özgeçmiş PDF’i<input name="resume" type="file" accept="application/pdf,.pdf" required /><small>Yalnızca PDF · En fazla 5 MB</small></label>
            <button type="submit">{resumeProfile?.resume_path ? 'Özgeçmişi güncelle →' : 'Özgeçmişi ekle →'}</button>
          </form>
        </div></div>
      </details>}

      {role === 'freelancer' && <details className="profile-manager-accordion portfolio-manager" id="profile-section-05">
        <ProfileAccordionSummary number="05" title="Portföy vitrini" description="En iyi çalışmalarını ekle ve sergile." status={portfolio?.length ? `${portfolio?.length} çalışma${brokenPortfolioIds.size ? ` · ${brokenPortfolioIds.size} dosya eksik` : ''}` : 'Henüz yok'} />
        <div className="profile-manager-accordion-body"><div className="portfolio-manager-layout">
          <form action={createPortfolioItem} className="portfolio-upload-form">
            <span>YENİ ÇALIŞMA</span>
            <h3>Portföye ekle</h3>
            <label>Çalışma başlığı<input name="title" minLength={2} maxLength={100} required placeholder="Örn. Mobil bankacılık arayüzü" /></label>
            <label>Kısa açıklama<textarea name="description" rows={4} maxLength={1500} placeholder="Projede ne yaptığını ve sonucu kısaca anlat." /></label>
            <label className="portfolio-file-field">Görsel veya PDF<input name="file" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required /><small>JPG, PNG, WebP veya PDF · En fazla 10 MB</small></label>
            <button type="submit">Çalışmayı yayınla →</button>
          </form>
          <div className="portfolio-manage-grid">
            {portfolioWithUrls.map((item) => <article key={item.id}>
              <a className={`portfolio-card-media ${isPortfolioImage(item.display_url) ? '' : 'document'}`} href={item.display_url || '#'} target="_blank" rel="noreferrer" aria-disabled={!item.display_url}>
                {isPortfolioImage(item.display_url) && item.display_url ? <Image src={item.display_url} width={800} height={500} alt={item.title} /> : <><strong>{item.display_url ? 'PDF' : '!'}</strong><span>{item.display_url ? 'Dosyayı aç ↗' : 'Dosya erişilemiyor'}</span></>}
              </a>
              <div className="portfolio-card-copy"><div><h3>{item.title}</h3><p>{item.description || 'Açıklama eklenmedi.'}</p>{brokenPortfolioIds.has(item.id) && <small className="portfolio-stale-note">Dosya depolamadan silinmiş — çalışmayı yeniden yükle veya kaldır.</small>}</div><details><summary>Kaldır</summary><form action={deletePortfolioItem.bind(null, item.id)}><p>Bu çalışma ve dosyası kalıcı olarak silinecek.</p><button type="submit">Silme işlemini onayla</button></form></details></div>
            </article>)}
            {portfolio?.length === 0 && <div className="marketplace-empty portfolio-manager-empty"><strong>Vitrinin henüz boş.</strong><p>İşverenlerin yeteneğini görebilmesi için ilk çalışmanı ekle.</p></div>}
          </div>
        </div></div>
      </details>}
    </MarketplaceShell>
  )
}
