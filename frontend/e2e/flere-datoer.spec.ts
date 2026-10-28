import { expect, test, type Page } from '@playwright/test'

const STORAGE_KEY = 'aarhjul:v1:todos'

const form = (page: Page) => page.getByRole('dialog', { name: 'Nytt gjøremål' })
const dateField = (page: Page, n: number) => form(page).getByLabel(`Dato ${String(n)}`, { exact: true })
const dateFields = (page: Page) => form(page).getByLabel(/^Dato \d+$/)
const addDate = (page: Page) => form(page).getByRole('button', { name: '+ Legg til ekstra dato' })
const column = (page: Page) => page.getByRole('complementary', { name: 'Denne måneden' })
const dots = (page: Page) => page.getByRole('group', { name: 'Årshjul med gjøremål' }).getByRole('button')
const stored = async (page: Page) =>
  JSON.parse((await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)) ?? '[]') as {
    title: string
    dates: { month: number; day: number }[]
  }[]

async function openForm(page: Page, title: string) {
  await page.clock.setFixedTime(new Date('2026-10-27T12:00:00'))
  await page.goto('./')
  await page.getByRole('button', { name: '+ Legg til nytt gjøremål' }).click()
  await form(page).getByLabel('Tittel').fill(title)
}

async function save(page: Page) {
  await form(page).getByRole('button', { name: 'Lagre' }).click()
}

test('«+ Legg til ekstra dato» legger til et nytt datofelt, og et felt kan fjernes med «Fjern»', async ({ page }) => {
  await openForm(page, 'Lese av strømmåleren')
  await expect(form(page).getByRole('button', { name: /Fjern/ })).toHaveCount(0)
  await dateField(page, 1).fill('01.01')

  await addDate(page).click()
  await expect(dateFields(page)).toHaveCount(2)
  await expect(dateField(page, 2)).toBeFocused()
  await dateField(page, 2).fill('01.07')
  await addDate(page).click()
  await dateField(page, 3).fill('01.10')

  await form(page).getByRole('button', { name: 'Fjern dato 2' }).click()
  await expect(dateFields(page)).toHaveCount(2)
  await expect(dateField(page, 1)).toHaveValue('01.01')
  await expect(dateField(page, 2)).toHaveValue('01.10')

  await save(page)
  await expect(form(page)).toHaveCount(0)
  expect((await stored(page))[0]?.dates).toEqual([
    { month: 1, day: 1 },
    { month: 10, day: 1 },
  ])
})

test('det går ikke å legge til mer enn 12 datoer', async ({ page }) => {
  await openForm(page, 'Lese av strømmåleren')
  for (let n = 2; n <= 12; n++) {
    await addDate(page).click()
    await expect(dateFields(page)).toHaveCount(n)
  }
  await expect(addDate(page)).toHaveCount(0)
  await expect(form(page).getByText('Maks 12 datoer per gjøremål.')).toBeVisible()

  for (let n = 1; n <= 12; n++) await dateField(page, n).fill(`01.${String(n).padStart(2, '0')}`)
  await save(page)
  await expect(form(page)).toHaveCount(0)
  await expect(dots(page)).toHaveCount(12)
  expect((await stored(page))[0]?.dates).toHaveLength(12)
})

test('samme dato to ganger gir melding, og ingenting lagres', async ({ page }) => {
  await openForm(page, 'Vårvask av garasjen')
  await dateField(page, 1).fill('15.05')
  await addDate(page).click()
  await dateField(page, 2).fill('15/5')
  await save(page)

  await expect(dateField(page, 2)).toHaveAccessibleDescription('15. mai er allerede lagt inn på dette gjøremålet.')
  await expect(form(page).getByText('15. mai er allerede lagt inn på dette gjøremålet.')).toBeVisible()
  await expect(form(page)).toBeVisible()
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBeNull()
  await expect(dots(page)).toHaveCount(0)
})

test('et gjøremål med to datoer gir to prikker og ett kort', async ({ page }) => {
  await openForm(page, 'Rense takrennene')
  await dateField(page, 1).fill('03.10')
  await addDate(page).click()
  await dateField(page, 2).fill('20.10')
  await save(page)

  await expect(dots(page)).toHaveCount(2)
  const cards = column(page).getByRole('article')
  await expect(cards).toHaveCount(1)
  await expect(cards.getByText('3. okt', { exact: true })).toBeVisible()
  await expect(cards.getByText('20. okt', { exact: true })).toBeVisible()

  await page.reload()
  await expect(dots(page)).toHaveCount(2)
  await expect(column(page).getByRole('article')).toHaveCount(1)
})
