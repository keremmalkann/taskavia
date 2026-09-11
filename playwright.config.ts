import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.TASKAVIA_E2E_BASE_URL ?? 'http://127.0.0.1:3000'
const remoteWritesEnabled = process.env.TASKAVIA_E2E_ALLOW_REMOTE_WRITE === 'true'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['line'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: remoteWritesEnabled ? {
    command: process.env.CI ? 'npm start' : 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  } : undefined,
})
