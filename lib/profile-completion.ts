export type ProfileRole = 'freelancer' | 'employer'

export type ProfileCompletionInput = {
  role: ProfileRole
  profile: {
    full_name?: string | null
    title?: string | null
    bio?: string | null
    company_name?: string | null
    skills?: string[] | null
    hourly_rate?: number | null
    experience_years?: number | null
  }
  portfolioCount?: number
  hasResume?: boolean
  /** Resume storage doğrulaması: true = dosya var, false = dosya kayıp, undefined = bilinmiyor */
  resumeValid?: boolean
}

export type ProfileField = {
  key: string
  sectionId: string
  title: string
  description: string
  complete: boolean
  /** 0..1 — tamamlanma payı (beceri gibi kısmi dolan alanlar için) */
  progress: number
  hint?: string
}

const min = (value: unknown) => Boolean(value && String(value).trim().length >= 2)
const filled = (value: unknown) => value != null && String(value).trim().length > 0

function freelancerFields(input: ProfileCompletionInput): ProfileField[] {
  const { profile, portfolioCount = 0, hasResume = false, resumeValid } = input
  const resumeReady = hasResume && resumeValid !== false
  const resumeBlocked = hasResume && resumeValid === false
  const skills = profile.skills?.filter(Boolean) ?? []
  const skillProgress = Math.min(1, skills.length / 3)

  return [
    {
      key: 'full_name', sectionId: 'profile-section-01',
      title: 'Ad soyad', description: 'İşverenlerin seni tanıması için görünen adın.',
      complete: min(profile.full_name), progress: min(profile.full_name) ? 1 : 0,
      hint: 'Ad soyad alanını doldur.',
    },
    {
      key: 'title', sectionId: 'profile-section-01',
      title: 'Uzmanlık başlığı', description: 'Ne yaptığını tek cümlede anlat.',
      complete: filled(profile.title), progress: filled(profile.title) ? 1 : 0,
      hint: 'Örn. Product Designer, Frontend Developer.',
    },
    {
      key: 'bio', sectionId: 'profile-section-01',
      title: 'Hakkında', description: 'Deneyimini ve çalışma biçimini anlatan kısa metin.',
      complete: filled(profile.bio), progress: filled(profile.bio) ? 1 : 0,
      hint: 'Birkaç cümle bile profilini güçlendirir.',
    },
    {
      key: 'skills', sectionId: 'profile-section-02',
      title: 'Yetenekler', description: 'En az 3 beceri, doğru eşleşme şansını artırır.',
      complete: skills.length >= 3, progress: skillProgress,
      hint: skills.length > 0 ? `${skills.length} beceri eklendi. 3 veya daha fazla önerilir.` : 'Beceri eklemeye başla.',
    },
    {
      key: 'hourly_rate', sectionId: 'profile-section-02',
      title: 'Saatlik ücret', description: 'Bütçe eşleşmeleri için güncel ücretin.',
      complete: profile.hourly_rate != null, progress: profile.hourly_rate != null ? 1 : 0,
      hint: 'Beklentini belirt; boş bırakmak eşleşmeleri azaltır.',
    },
    {
      key: 'experience_years', sectionId: 'profile-section-02',
      title: 'Deneyim', description: 'Toplam çalışma deneyimin (yıl).',
      complete: profile.experience_years != null, progress: profile.experience_years != null ? 1 : 0,
      hint: 'Deneyim yılını ekle.',
    },
    {
      key: 'resume', sectionId: 'profile-section-04',
      title: 'Özgeçmiş', description: 'Güncel PDF özgeçmişin işverenlere sunulur.',
      complete: resumeReady, progress: resumeReady ? 1 : 0,
      hint: resumeBlocked ? 'Yüklenen dosya bulunamadı; yeniden yükle.' : 'PDF özgeçmişini ekle.',
    },
    {
      key: 'portfolio', sectionId: 'profile-section-05',
      title: 'Portföy çalışması', description: 'En az bir tamamlanmış çalışmanı sergile.',
      complete: portfolioCount >= 1, progress: portfolioCount >= 1 ? 1 : 0,
      hint: 'İlk çalışmanı ekleyerek vitrini aç.',
    },
  ]
}

function employerFields(input: ProfileCompletionInput): ProfileField[] {
  const { profile } = input
  return [
    {
      key: 'full_name', sectionId: 'profile-section-01',
      title: 'Ad soyad', description: 'İletişime geçenlerin seni tanıması için.',
      complete: min(profile.full_name), progress: min(profile.full_name) ? 1 : 0,
      hint: 'Ad soyad alanını doldur.',
    },
    {
      key: 'company_name', sectionId: 'profile-section-01',
      title: 'Şirket adı', description: 'Freelancerlar kime iş yapacaklarını bilmek ister.',
      complete: filled(profile.company_name), progress: filled(profile.company_name) ? 1 : 0,
      hint: 'Şirket veya marka adını ekle.',
    },
    {
      key: 'title', sectionId: 'profile-section-01',
      title: 'Pozisyon', description: 'Şirketteki rolünü belirt.',
      complete: filled(profile.title), progress: filled(profile.title) ? 1 : 0,
      hint: 'Örn. Kurucu, Ürün Yöneticisi.',
    },
    {
      key: 'bio', sectionId: 'profile-section-01',
      title: 'Şirket hakkında', description: 'İlanlarının ve şirketinin arka planı.',
      complete: filled(profile.bio), progress: filled(profile.bio) ? 1 : 0,
      hint: 'Şirketin iş alanını ve kültürünü kısaca anlat.',
    },
  ]
}

const weights: Record<string, Record<string, number>> = {
  freelancer: { full_name: 10, title: 15, bio: 15, skills: 20, hourly_rate: 10, experience_years: 10, resume: 10, portfolio: 10 },
  employer: { full_name: 15, company_name: 25, title: 20, bio: 40 },
}

export function getProfileCompletion(input: ProfileCompletionInput) {
  const items = input.role === 'freelancer' ? freelancerFields(input) : employerFields(input)
  const weightMap = weights[input.role]
  const totalWeight = items.reduce((sum, item) => sum + weightMap[item.key], 0)
  const earned = items.reduce((sum, item) => sum + weightMap[item.key] * item.progress, 0)
  const percent = Math.round((earned / totalWeight) * 100)
  const missing = items.filter((item) => !item.complete)
  return { percent, items, missing }
}
