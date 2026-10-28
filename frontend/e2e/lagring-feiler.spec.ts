import { expect, test, type Page } from '@playwright/test'

const STORAGE_KEY = 'aarhjul:v1:todos'
const BLOCKED = 'Nettleseren tillater ikke lagring. Gjøremål kan ikke lagres før du tillater nettstedsdata for denne siden.'
const SAVE_FAILED = 'Kunne ikke lagre. Lagringen i nettleseren er full eller blokkert.'
const DELETE_FAILED = 'Kunne ikke slette. Lagringen i nettleseren er full eller blokkert.'

const TODOS = [
  {
    id: 'a1',
    title: 'Dekkskift',
    description: '',
    dates: [
      { month: 4, day: 15 },
      { month: 10, day: 15 },
    ],
    createdAt: '2026-01-02T09:00:00.000Z',
  },
]
const STORED = JSON.stringify(TODOS)

const column = (page: Page) => page.getByRole('complementary', { name: 'Denne måneden' })
const card = (page: Page, title: string) =>
  column(page).getByRole('article').filter({ has: page.getByRole('heading', { name: title, exact: true }) })
const dotsOf = (page: Page, title: string) => page.getByRole('button', { name: new RegExp(`^${title}, `) })
const newForm = (page: Page) => page.getByRole('dialog', { name: 'Nytt gjøremål' })
const editForm = (page: Page) => page.getByRole('dialog', { name: 'Rediger gjøremål' })
const confirm = (page: Page) => page.getByRole('dialog', { name: 'Er du sikker?' })
// Read through the real getItem, which the full storage below leaves alone
const stored = (page: Page) => page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)

// What the browser does when the user has blocked site data: even reaching localStorage throws
async function openBlocked(page: Page) {
  await page.clock.setFixedTime(new Date('2026-10-27T12:00:00'))
  await page.addInitScript({
    content: `Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('Lagring er sperret', 'SecurityError')
      },
    })`,
  })
  await page.goto('./')
}

// One todo is stored, then every write fails as it does when storage is full
async function openFull(page: Page) {
  await page.clock.setFixedTime(new Date('2026-10-27T12:00:00'))
  await page.addInitScript({
    content: `localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${JSON.stringify(STORED)})
      Storage.prototype.setItem = function () {
        throw new DOMException('Lagringen er full', 'QuotaExceededError')
      }`,
  })
  await page.goto('./')
  await expect(dotsOf(page, 'Dekkskift')).toHaveCount(2)
}

async function fillNew(page: Page, title: string, date: string) {
  await page.getByRole('button', { name: '+ Legg til nytt gjøremål' }).click()
  await newForm(page).getByLabel('Tittel').fill(title)
  await newForm(page).getByLabel('Dato 1', { exact: true }).fill(date)
  await newForm(page).getByRole('button', { name: 'Lagre' }).click()
}

test('blokkert lagring gir tom liste og en melding i stedet for hvit side', async ({ page }) => {
  await openBlocked(page)
  await expect(page.getByText(BLOCKED)).toBeVisible()
  await expect(page.getByRole('group', { name: 'Årshjul med gjøremål' })).toBeVisible()
  await expect(column(page).getByText('Ingen oppgaver denne måneden')).toBeVisible()

  await fillNew(page, 'Rense takrennene', '03.10')
  await expect(newForm(page)).toBeVisible()
  await expect(newForm(page).getByText(SAVE_FAILED)).toBeVisible()
  await expect(dotsOf(page, 'Rense takrennene')).toHaveCount(0)
  await expect(column(page).getByRole('article')).toHaveCount(0)
})

test('full lagring lar skjemaet stå åpent med melding, og ingenting endres', async ({ page }) => {
  await openFull(page)

  await fillNew(page, 'Rense takrennene', '03.10')
  await expect(newForm(page)).toBeVisible()
  await expect(newForm(page).getByText(SAVE_FAILED)).toBeVisible()
  await expect(newForm(page).getByLabel('Tittel')).toHaveValue('Rense takrennene')
  await expect(dotsOf(page, 'Rense takrennene')).toHaveCount(0)
  await newForm(page).getByRole('button', { name: 'Avbryt' }).click()

  await card(page, 'Dekkskift').getByRole('button', { name: 'Rediger «Dekkskift»' }).click()
  await editForm(page).getByLabel('Tittel').fill('Dekkskift til vinter')
  await editForm(page).getByRole('button', { name: 'Lagre' }).click()
  await expect(editForm(page)).toBeVisible()
  await expect(editForm(page).getByText(SAVE_FAILED)).toBeVisible()
  await editForm(page).getByRole('button', { name: 'Avbryt' }).click()

  await expect(card(page, 'Dekkskift')).toBeVisible()
  await expect(card(page, 'Dekkskift til vinter')).toHaveCount(0)
  await expect(dotsOf(page, 'Dekkskift')).toHaveCount(2)
  expect(await stored(page)).toBe(STORED)
})

test('sletting som ikke kan lagres, lar gjøremålet stå og gir melding', async ({ page }) => {
  await openFull(page)
  await card(page, 'Dekkskift').getByRole('button', { name: 'Slett «Dekkskift»' }).click()
  await confirm(page).getByRole('button', { name: 'Ja, slett' }).click()

  await expect(confirm(page)).toBeVisible()
  await expect(confirm(page).getByText(DELETE_FAILED)).toBeVisible()
  await expect(card(page, 'Dekkskift')).toBeVisible()
  await expect(dotsOf(page, 'Dekkskift')).toHaveCount(2)
  expect(await stored(page)).toBe(STORED)
})

test('meldingene leses opp av skjermleser', async ({ page: blocked, context }) => {
  await openBlocked(blocked)
  // The alert also holds its «Lukk» button
  await expect(blocked.getByRole('alert')).toContainText(BLOCKED)
  await expect(blocked.getByRole('alert').getByRole('button', { name: 'Lukk' })).toBeVisible()

  // A page of its own, since init scripts stay with the page they were added to
  const page = await context.newPage()
  await openFull(page)
  await page.getByRole('button', { name: '+ Legg til nytt gjøremål' }).click()
  await expect(newForm(page).getByRole('alert')).toHaveCount(0)
  await newForm(page).getByLabel('Tittel').fill('Rense takrennene')
  await newForm(page).getByLabel('Dato 1', { exact: true }).fill('03.10')
  await newForm(page).getByRole('button', { name: 'Lagre' }).click()
  await expect(newForm(page).getByRole('alert')).toHaveText(SAVE_FAILED)
  await newForm(page).getByRole('button', { name: 'Avbryt' }).click()

  await card(page, 'Dekkskift').getByRole('button', { name: 'Slett «Dekkskift»' }).click()
  await expect(confirm(page).getByRole('alert')).toHaveCount(0)
  await confirm(page).getByRole('button', { name: 'Ja, slett' }).click()
  await expect(confirm(page).getByRole('alert')).toHaveText(DELETE_FAILED)
})
