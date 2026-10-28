import { readFile } from 'node:fs/promises'
import { type BrowserContext, expect, test, type Page } from '@playwright/test'

const STORAGE_KEY = 'aarhjul:v1:todos'
const COPY_KEY = 'aarhjul:v1:corrupt-copy'
const FIRST_KEY = 'aarhjul:v1:corrupt-copy-first'
// The user's own data, corrupted first, and something else that comes later
const A = '[{"id": "a1", "tittel": "Dekkskift", "datoer": ["15.10"'
const B = '{"helt": "annet"'
const OLDER = 'En eldre kopi er også tatt vare på.'

const alert = (page: Page) => page.getByRole('alert')
const read = (page: Page, key: string) => page.evaluate((k) => localStorage.getItem(k), key)
const store = (page: Page, key: string, value: string) =>
  page.evaluate(([k, v]) => {
    localStorage.setItem(k, v)
  }, [key, value] as const)

// Stored only before the first load, so a reload shows what the app did with it
async function openWith(page: Page, raw: string, extra = '') {
  await page.clock.setFixedTime(new Date('2026-10-27T12:00:00'))
  await page.addInitScript({
    content: `${extra}
      if (sessionStorage.getItem('seeded') === null) {
        localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${JSON.stringify(raw)})
        sessionStorage.setItem('seeded', '1')
      }`,
  })
  await page.goto('./')
}

async function openTab(context: BrowserContext) {
  const page = await context.newPage()
  await page.clock.setFixedTime(new Date('2026-10-27T12:00:00'))
  await page.goto('./')
  return page
}

async function download(page: Page, button: string) {
  const [file] = await Promise.all([page.waitForEvent('download'), alert(page).getByRole('button', { name: button }).click()])
  return { name: file.suggestedFilename(), content: await readFile(await file.path(), 'utf8') }
}

test('en kopi som ikke er lastet ned, overskrives ikke når nye ødelagte data kommer fra en annen fane', async ({
  page,
  context,
}) => {
  await openWith(page, A)
  await expect(alert(page)).toBeVisible()
  expect(await read(page, COPY_KEY)).toBe(A)

  const other = await openTab(context)
  await store(other, STORAGE_KEY, B)

  await expect(alert(page)).toContainText(OLDER)
  expect(await read(page, COPY_KEY)).toBe(B)
  expect(await read(page, FIRST_KEY)).toBe(A)
})

test('begge kopiene kan lastes ned fra varselet, og teksten sier hva som er tatt vare på', async ({ page }) => {
  await openWith(page, A)
  await expect(alert(page)).toContainText('En kopi av de ødelagte dataene er tatt vare på.')
  await expect(alert(page)).not.toContainText('eldre kopi')
  await expect(alert(page).getByRole('button', { name: 'Last ned eldre kopi' })).toHaveCount(0)

  await store(page, STORAGE_KEY, B)
  await page.reload()
  await expect(alert(page)).toContainText(`En kopi av de ødelagte dataene er tatt vare på. ${OLDER}`)
  expect(await download(page, 'Last ned kopien')).toEqual({ name: 'aarshjul-odelagte-data.json', content: B })
  expect(await download(page, 'Last ned eldre kopi')).toEqual({ name: 'aarshjul-odelagte-data-eldre.json', content: A })
})

test('når lagringen er full, sier varselet fra, og den eldre kopien beholdes', async ({ page }) => {
  // A copy of A is already kept; then storage is full, so no new copy fits
  const full = `localStorage.setItem(${JSON.stringify(COPY_KEY)}, ${JSON.stringify(A)})
    const setItem = Storage.prototype.setItem
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith(${JSON.stringify(COPY_KEY)})) throw new DOMException('Full', 'QuotaExceededError')
      return setItem.call(this, key, value)
    }`
  await openWith(page, B, full)

  await expect(alert(page)).toContainText('Kopien kunne ikke lagres i nettleseren. Last ned kopien før du lagrer noe nytt.')
  await expect(alert(page)).toContainText(OLDER)
  expect(await read(page, COPY_KEY)).toBe(A)
  expect(await read(page, FIRST_KEY)).toBeNull()
  expect(await download(page, 'Last ned eldre kopi')).toEqual({ name: 'aarshjul-odelagte-data-eldre.json', content: A })
})
