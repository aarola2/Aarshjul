import { expect, test, type Page } from '@playwright/test'

const STORAGE_KEY = 'aarhjul:v1:todos'
const TITLE = 'Rense takrennene'

test.skip(
  process.env['E2E_PREVIEW'] !== '1',
  'CSP-en legges bare inn i bygget. Kjøres med E2E_PREVIEW=1, lokalt, i CI-jobben e2e-bygg og i staging.',
)

const column = (page: Page) => page.getByRole('complementary', { name: 'Denne måneden' })
const card = (page: Page, title: string) =>
  column(page).getByRole('article').filter({ has: page.getByRole('heading', { name: title, exact: true }) })
const form = (page: Page, name: string) => page.getByRole('dialog', { name })
// Run in the browser; the e2e tests are type-checked without the DOM types
const policyOnPage = (page: Page) =>
  page.evaluate('document.querySelector(\'meta[http-equiv="Content-Security-Policy"]\')?.getAttribute("content") ?? null')
const violations = (page: Page) => page.evaluate('window.cspViolations')

// Every blocked script, style, image or font is collected, together with errors in the console
async function watchForViolations(page: Page) {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', (error) => {
    errors.push(error.message)
  })
  await page.addInitScript({
    content: `window.cspViolations = []
      document.addEventListener('securitypolicyviolation', (event) => {
        window.cspViolations.push(event.violatedDirective + ' ' + event.blockedURI)
      })`,
  })
  return errors
}

test('den bygde appen har CSP-en, og hovedflyten gir ingen brudd på den', async ({ page }) => {
  const errors = await watchForViolations(page)
  await page.clock.setFixedTime(new Date('2026-10-27T12:00:00'))
  await page.goto('./')

  const policy = await policyOnPage(page)
  expect(policy).toContain("default-src 'none'")
  expect(policy).toContain("script-src 'self'")
  expect(policy).not.toContain('unsafe-inline')

  await page.getByRole('button', { name: '+ Legg til nytt gjøremål' }).click()
  await form(page, 'Nytt gjøremål').getByLabel('Tittel').fill(TITLE)
  await form(page, 'Nytt gjøremål').getByLabel('Dato 1', { exact: true }).fill('03.10')
  await form(page, 'Nytt gjøremål').getByRole('button', { name: '+ Legg til ekstra dato' }).click()
  await form(page, 'Nytt gjøremål').getByLabel('Dato 2', { exact: true }).fill('20.10')
  await form(page, 'Nytt gjøremål').getByRole('button', { name: 'Lagre' }).click()

  // The tooltip is placed with an inline style, set through the DOM
  const dot = page.getByRole('button', { name: `${TITLE}, 3. oktober`, exact: true })
  await dot.hover()
  await expect(page.getByRole('tooltip')).toHaveText(TITLE)
  await dot.click()
  await page.getByRole('dialog', { name: TITLE }).getByRole('button', { name: 'Rediger' }).click()
  await form(page, 'Rediger gjøremål').getByLabel('Tittel').fill(`${TITLE} og nedløp`)
  await form(page, 'Rediger gjøremål').getByRole('button', { name: 'Lagre' }).click()
  await card(page, `${TITLE} og nedløp`).getByRole('button', { name: `Slett «${TITLE} og nedløp»` }).click()
  await page.getByRole('dialog', { name: 'Er du sikker?' }).getByRole('button', { name: 'Ja, slett' }).click()
  await expect(column(page).getByText('Ingen oppgaver denne måneden')).toBeVisible()
  // Checked before the reload below, which starts a new list
  expect(await violations(page)).toEqual([])

  // The copy of corrupt data is downloaded through a blob: address
  await page.evaluate((key) => {
    localStorage.setItem(key, '[{"id":')
  }, STORAGE_KEY)
  await page.reload()
  const download = page.waitForEvent('download')
  await page.getByRole('alert').getByRole('button', { name: 'Last ned kopien' }).click()
  expect((await download).suggestedFilename()).toBe('aarshjul-odelagte-data.json')

  expect(await violations(page)).toEqual([])
  expect(errors).toEqual([])
})
