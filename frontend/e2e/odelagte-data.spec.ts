import { readFile } from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'

const STORAGE_KEY = 'aarhjul:v1:todos'
const COPY_KEY = 'aarhjul:v1:corrupt-copy'
const CORRUPT = '[{"id": "a1", "tittel": "Dekkskift", "datoer": ["15.10"'
const MESSAGE =
  'Lagrede data var ødelagt. De kunne ikke leses, så årshjulet startet med en tom liste. En kopi av de ødelagte dataene er tatt vare på.'

const alert = (page: Page) => page.getByRole('alert')
const column = (page: Page) => page.getByRole('complementary', { name: 'Denne måneden' })
const dots = (page: Page) => page.getByRole('group', { name: 'Årshjul med gjøremål' }).getByRole('button')
const read = (page: Page, key: string) => page.evaluate((k) => localStorage.getItem(k), key)

// Written only before the first load, so a reload shows what the app did with it
async function openWith(page: Page, raw: string) {
  await page.clock.setFixedTime(new Date('2026-10-27T12:00:00'))
  await page.addInitScript({
    content: `if (sessionStorage.getItem('seeded') === null) {
      localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${JSON.stringify(raw)})
      sessionStorage.setItem('seeded', '1')
    }`,
  })
  await page.goto('./')
}

test('ødelagte data ignoreres, og appen starter med tom liste', async ({ page }) => {
  await openWith(page, CORRUPT)
  await expect(page.getByRole('group', { name: 'Årshjul med gjøremål' })).toBeVisible()
  await expect(dots(page)).toHaveCount(0)
  await expect(column(page).getByRole('article')).toHaveCount(0)

  // Valid JSON with the wrong content is treated the same way
  await page.evaluate((key) => {
    localStorage.setItem(key, JSON.stringify([{ id: 'a1', title: '', dates: [] }]))
  }, STORAGE_KEY)
  await page.reload()
  await expect(dots(page)).toHaveCount(0)
  await expect(alert(page)).toBeVisible()
})

test('en varselstripe sier at lagrede data var ødelagt', async ({ page }) => {
  await openWith(page, CORRUPT)
  await expect(alert(page)).toHaveText(new RegExp(`^${MESSAGE.replaceAll('.', '\\.')}`))
  await expect(alert(page).getByRole('button', { name: 'Last ned kopien' })).toBeVisible()
})

test('en kopi tas vare på separat og overskrives ikke når brukeren lagrer noe nytt', async ({ page }) => {
  await openWith(page, CORRUPT)
  await expect(alert(page)).toBeVisible()
  expect(await read(page, COPY_KEY)).toBe(CORRUPT)

  await page.getByRole('button', { name: '+ Legg til nytt gjøremål' }).click()
  const form = page.getByRole('dialog', { name: 'Nytt gjøremål' })
  await form.getByLabel('Tittel').fill('Dekkskift')
  await form.getByLabel('Dato 1', { exact: true }).fill('15.10')
  await form.getByRole('button', { name: 'Lagre' }).click()
  await expect(dots(page)).toHaveCount(1)

  expect(JSON.parse((await read(page, STORAGE_KEY)) ?? '[]')).toHaveLength(1)
  expect(await read(page, COPY_KEY)).toBe(CORRUPT)
  await page.reload()
  expect(await read(page, COPY_KEY)).toBe(CORRUPT)
})

test('«Last ned kopien» laster ned kopien som fil, og «Lukk» skjuler meldingen', async ({ page }) => {
  await openWith(page, CORRUPT)
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    alert(page).getByRole('button', { name: 'Last ned kopien' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('aarshjul-odelagte-data.json')
  expect(await readFile(await download.path(), 'utf8')).toBe(CORRUPT)

  await alert(page).getByRole('button', { name: 'Lukk' }).click()
  await expect(alert(page)).toHaveCount(0)
})

test('når kopien ikke kan lagres i nettleseren, sier meldingen det', async ({ page }) => {
  // Full storage: the copy is refused, everything else works as usual
  await page.addInitScript({
    content: `const setItem = Storage.prototype.setItem
    Storage.prototype.setItem = function (key, value) {
      if (key === ${JSON.stringify(COPY_KEY)}) throw new DOMException('Full', 'QuotaExceededError')
      return setItem.call(this, key, value)
    }`,
  })
  await openWith(page, CORRUPT)
  await expect(alert(page)).toContainText('Kopien kunne ikke lagres i nettleseren. Last ned kopien før du lagrer noe nytt.')
  await expect(alert(page)).not.toContainText('tatt vare på')
  expect(await read(page, COPY_KEY)).toBeNull()

  // The copy can still be downloaded
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    alert(page).getByRole('button', { name: 'Last ned kopien' }).click(),
  ])
  expect(await readFile(await download.path(), 'utf8')).toBe(CORRUPT)
})
