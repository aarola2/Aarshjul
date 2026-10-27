import { expect, test, type Page } from '@playwright/test'

const STORAGE_KEY = 'aarhjul:v1:todos'
// The error colour from the design, #b3261e
const ERROR_COLOUR = 'rgb(179, 38, 30)'

const form = (page: Page) => page.getByRole('dialog', { name: 'Nytt gjøremål' })
const titleField = (page: Page) => form(page).getByLabel('Tittel')
const descriptionField = (page: Page) => form(page).getByLabel('Beskrivelse (valgfri)')
const stored = (page: Page) => page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)

async function openForm(page: Page) {
  await page.clock.setFixedTime(new Date('2026-10-27T12:00:00'))
  await page.goto('./')
  await page.getByRole('button', { name: '+ Legg til nytt gjøremål' }).click()
  await form(page).getByLabel('Dato 1', { exact: true }).fill('15.10')
}

async function save(page: Page) {
  await form(page).getByRole('button', { name: 'Lagre' }).click()
}

test('tittel over 60 tegn gir feilmelding ved feltet og lagres ikke', async ({ page }) => {
  await openForm(page)
  await titleField(page).fill('a'.repeat(61))
  await save(page)
  await expect(titleField(page)).toHaveAccessibleDescription('Tittelen kan ha maks 60 tegn.')
  await expect(titleField(page)).toHaveAttribute('aria-invalid', 'true')
  expect(await stored(page)).toBeNull()

  // 60 is allowed
  await titleField(page).fill('a'.repeat(60))
  await expect(form(page).getByText('Tittelen kan ha maks 60 tegn.')).toHaveCount(0)
  await save(page)
  await expect(form(page)).toHaveCount(0)
  const todos = JSON.parse((await stored(page)) ?? '[]') as { title: string }[]
  expect(todos[0]?.title).toHaveLength(60)
})

test('beskrivelse over 500 tegn gir feilmelding ved feltet og lagres ikke', async ({ page }) => {
  await openForm(page)
  await titleField(page).fill('Dekkskift')
  await descriptionField(page).fill('b'.repeat(501))
  await save(page)
  await expect(descriptionField(page)).toHaveAccessibleDescription('Beskrivelsen kan ha maks 500 tegn.')
  await expect(descriptionField(page)).toHaveAttribute('aria-invalid', 'true')
  expect(await stored(page)).toBeNull()

  // 500 is allowed
  await descriptionField(page).fill('b'.repeat(500))
  await save(page)
  await expect(form(page)).toHaveCount(0)
  const todos = JSON.parse((await stored(page)) ?? '[]') as { description: string }[]
  expect(todos[0]?.description).toHaveLength(500)
})

test('begge feltene har tegnteller', async ({ page }) => {
  await openForm(page)
  await expect(form(page).getByText('0/60', { exact: true })).toBeVisible()
  await expect(form(page).getByText('0/500', { exact: true })).toBeVisible()

  await titleField(page).fill('Dekkskift')
  await descriptionField(page).fill('Bytt til vinterdekk.')
  await expect(form(page).getByText('9/60', { exact: true })).toBeVisible()
  await expect(form(page).getByText('20/500', { exact: true })).toBeVisible()
  await expect(form(page).getByText('9/60', { exact: true })).not.toHaveCSS('color', ERROR_COLOUR)

  await titleField(page).fill('a'.repeat(61))
  await expect(form(page).getByText('61/60', { exact: true })).toHaveCSS('color', ERROR_COLOUR)
})
