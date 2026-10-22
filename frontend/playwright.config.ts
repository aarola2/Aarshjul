import { defineConfig, devices } from '@playwright/test'

const port = 5173
const appUrl = `http://localhost:${String(port)}/Aarshjul/`
// E2E_PREVIEW=1 serves the already built dist/ (used by staging in deploy.yml)
const serveBuiltApp = process.env['E2E_PREVIEW'] === '1'
const isCi = Boolean(process.env['CI'])

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: appUrl,
    screenshot: 'on',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: serveBuiltApp
      ? `npm run preview -- --port ${String(port)} --strictPort`
      : `npm run dev -- --port ${String(port)} --strictPort`,
    url: appUrl,
    reuseExistingServer: !isCi,
  },
})
