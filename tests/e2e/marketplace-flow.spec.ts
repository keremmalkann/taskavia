import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const enabled = process.env.TASKAVIA_E2E_ALLOW_REMOTE_WRITE === 'true'
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const expectedProjectRef = process.env.TASKAVIA_E2E_PROJECT_REF?.trim() ?? ''

type TestAccount = { id: string; email: string; role: 'employer' | 'freelancer' }

test.describe('Taskavia ana pazar yeri akışı', () => {
  test.skip(!enabled, 'Yalnızca izole test projesinde TASKAVIA_E2E_ALLOW_REMOTE_WRITE=true ile çalışır.')

  let admin: SupabaseClient
  let employer: TestAccount
  let freelancer: TestAccount
  let password: string
  const createdUserIds: string[] = []

  test.beforeAll(async () => {
    if (!supabaseUrl || !anonKey || !serviceRoleKey) throw new Error('E2E Supabase ortam değişkenleri eksik.')
    const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
    if (!expectedProjectRef || expectedProjectRef !== projectRef) {
      throw new Error(`Güvenlik kilidi: TASKAVIA_E2E_PROJECT_REF ${projectRef} test projesiyle eşleşmiyor.`)
    }

    admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const runId = `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`
    password = `Taskavia-${crypto.randomUUID()}!Aa1`

    async function createAccount(role: TestAccount['role']) {
      const email = `taskavia-browser-${runId}-${role}@example.com`
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: `E2E ${role} ${runId}`, role },
      })
      if (error || !data.user) throw error ?? new Error(`${role} test hesabı oluşturulamadı.`)
      createdUserIds.push(data.user.id)
      return { id: data.user.id, email, role }
    }

    employer = await createAccount('employer')
    freelancer = await createAccount('freelancer')
  })

  test.afterAll(async () => {
    if (!admin) return
    for (const userId of createdUserIds.reverse()) await admin.auth.admin.deleteUser(userId)
  })

  async function login(page: Page, account: TestAccount) {
    await page.goto('/login')
    await page.getByLabel('E-posta').fill(account.email)
    await page.getByLabel('Şifre').fill(password)
    await page.getByRole('button', { name: 'Giriş yap' }).click()
    await expect(page).toHaveURL(new RegExp(account.role === 'employer' ? '/employer$' : '/freelancer$'))
  }

  async function freshPage(context: BrowserContext) {
    const page = await context.newPage()
    page.setDefaultTimeout(20_000)
    return page
  }

  test('işveren ve freelancer işi değerlendirmeye kadar tamamlar', async ({ browser }) => {
    const employerContext = await browser.newContext()
    const freelancerContext = await browser.newContext()
    const employerPage = await freshPage(employerContext)
    const freelancerPage = await freshPage(freelancerContext)
    const uniqueTitle = `Playwright proje ${Date.now()}`

    try {
      await test.step('İşveren ilan oluşturur', async () => {
        await login(employerPage, employer)
        await employerPage.goto('/employer/jobs/new')
        await employerPage.getByLabel('İlan başlığı').fill(uniqueTitle)
        await employerPage.getByLabel('Açıklama').fill('Playwright uçtan uca testi için hazırlanmış, kabul kriterleri açık ve doğrulanabilir proje açıklaması.')
        await employerPage.getByLabel('Kategori').selectOption({ label: 'Yazılım' })
        await employerPage.getByLabel('Gerekli beceriler').fill('TypeScript, Next.js, Playwright')
        await employerPage.getByLabel('Minimum bütçe').fill('1500')
        await employerPage.getByLabel('Maksimum bütçe').fill('3500')
        const deadline = new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10)
        await employerPage.getByLabel('Son tarih').fill(deadline)
        await employerPage.getByRole('button', { name: 'İlanı önizle' }).click()
        await expect(employerPage.getByRole('dialog').getByRole('heading', { name: uniqueTitle })).toBeVisible()
        await employerPage.getByRole('button', { name: 'Düzenlemeye dön' }).click()
        await employerPage.getByRole('button', { name: 'İlanı yayınla' }).click()
        await expect(employerPage).toHaveURL(/\/jobs\/[0-9a-f-]+/i)
        await expect(employerPage.getByRole('heading', { name: uniqueTitle })).toBeVisible()
      })

      const jobId = employerPage.url().match(/\/jobs\/([0-9a-f-]+)/i)?.[1]
      expect(jobId, 'Oluşturulan ilanın kimliği URL üzerinden okunabilmeli').toBeTruthy()

      await test.step('Freelancer teklif verir', async () => {
        await login(freelancerPage, freelancer)
        await freelancerPage.goto(`/jobs?q=${encodeURIComponent(uniqueTitle)}&maxBudget=3500&sort=newest`)
        await expect(freelancerPage.getByRole('heading', { name: uniqueTitle })).toBeVisible()
        await freelancerPage.goto(`/jobs/${jobId}`)
        await freelancerPage.getByLabel('Teklif tutarı').fill('2400')
        await freelancerPage.getByLabel('Teslim süresi').fill('8')
        await freelancerPage.getByLabel('Kısa mesaj').fill('Projeyi inceledim; kapsamı sekiz gün içinde testleriyle birlikte teslim edebilirim.')
        await freelancerPage.getByRole('button', { name: 'Teklifimi gönder' }).click()
        await expect(freelancerPage.getByText('Teklifin işverene gönderildi.')).toBeVisible()
      })

      let workspacePath = ''
      await test.step('İşveren teklifi kabul eder', async () => {
        await employerPage.goto(`/employer/jobs/${jobId}/proposals`)
        await employerPage.getByLabel('ÖZEL ADAY NOTUN').fill('Teknik kapsamı doğru anlamış; ilk görüşmede teslim planı sorulacak.')
        await employerPage.getByRole('button', { name: 'Notu kaydet' }).click()
        await expect(employerPage.getByText('Aday notu kaydedildi.')).toBeVisible()
        await expect(employerPage.getByRole('button', { name: 'Teklifi kabul et' })).toBeVisible()
        await employerPage.getByRole('button', { name: 'Teklifi kabul et' }).click()
        await expect(employerPage.getByText('Teklif kabul edildi. Mesajlaşma artık açık.')).toBeVisible()
        const workspaceLink = employerPage.getByRole('link', { name: 'Çalışma alanına git' }).first()
        workspacePath = await workspaceLink.getAttribute('href') ?? ''
        expect(workspacePath).toMatch(/^\/messages\/[0-9a-f-]+$/i)
      })

      await test.step('Taraflar mesajlaşır', async () => {
        await employerPage.goto(workspacePath)
        await employerPage.getByLabel('Mesaj').fill('Merhaba, başlangıç planını bugün netleştirelim.')
        await employerPage.getByRole('button', { name: 'Mesajı gönder' }).click()
        await expect(employerPage.getByText('Merhaba, başlangıç planını bugün netleştirelim.')).toBeVisible()

        await freelancerPage.goto(workspacePath)
        await expect(freelancerPage.getByText('Merhaba, başlangıç planını bugün netleştirelim.')).toBeVisible()
        await freelancerPage.getByLabel('Mesaj').fill('Uygun, ilk teslimat planını bugün paylaşacağım.')
        await freelancerPage.getByRole('button', { name: 'Mesajı gönder' }).click()
        await expect(freelancerPage.getByText('Uygun, ilk teslimat planını bugün paylaşacağım.')).toBeVisible()
      })

      await test.step('İşveren işi tamamlar', async () => {
        await employerPage.goto(workspacePath)
        await employerPage.getByRole('button', { name: 'Çalışmayı tamamla' }).click()
        await expect(employerPage.getByText('Çalışma tamamlandı. Artık karşılıklı değerlendirme bırakabilirsiniz.')).toBeVisible()
        await expect(employerPage.getByRole('heading', { name: 'Çalışma tamamlandı' })).toBeVisible()
      })

      await test.step('İşveren ve freelancer değerlendirme bırakır', async () => {
        await employerPage.getByRole('link', { name: 'Değerlendirme bırak' }).click()
        await employerPage.getByLabel('Puan').selectOption('5')
        await employerPage.getByLabel('Yorum').fill('İletişimi güçlü, teslimatı düzenli ve kaliteliydi.')
        await employerPage.getByRole('button', { name: 'Değerlendirmeyi yayınla' }).click()
        await expect(employerPage.getByText('Değerlendirmen yayınlandı.')).toBeVisible()

        await freelancerPage.goto(workspacePath)
        await freelancerPage.getByRole('link', { name: 'Değerlendirme bırak' }).click()
        await freelancerPage.getByLabel('Puan').selectOption('5')
        await freelancerPage.getByLabel('Yorum').fill('Kapsam netti ve işveren iletişimi düzenliydi.')
        await freelancerPage.getByRole('button', { name: 'Değerlendirmeyi yayınla' }).click()
        await expect(freelancerPage.getByText('Değerlendirmen yayınlandı.')).toBeVisible()
      })

      const [{ data: job }, { count: messageCount }, { count: reviewCount }, { count: candidateNoteCount }] = await Promise.all([
        admin.from('jobs').select('status').eq('id', jobId!).single(),
        admin.from('messages').select('id', { count: 'exact', head: true }).eq('proposal_id', workspacePath.split('/').at(-1)!),
        admin.from('reviews').select('id', { count: 'exact', head: true }).eq('job_id', jobId!),
        admin.from('proposal_notes').select('proposal_id', { count: 'exact', head: true }).eq('proposal_id', workspacePath.split('/').at(-1)!),
      ])
      expect(job?.status).toBe('completed')
      expect(messageCount).toBe(2)
      expect(reviewCount).toBe(2)
      expect(candidateNoteCount).toBe(1)
    } finally {
      await employerContext.close()
      await freelancerContext.close()
    }
  })
})
