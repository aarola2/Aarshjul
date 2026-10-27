import { expect, test, type Page } from '@playwright/test'

const STORAGE_KEY = 'aarhjul:v1:todos'

const EXISTING = [
  {
    id: 'a1',
    title: 'Vårvask av garasjen',
    description: '',
    dates: [{ month: 5, day: 15 }],
    createdAt: '2026-01-02T09:00:00.000Z',
  },
]

const addButton = (page: Page) => page.getByRole('button', { name: '+ Legg til nytt gjøremål' })
const form = (page: Page) => page.getByRole('dialog', { name: 'Nytt gjøremål' })
const column = (page: Page) => page.getByRole('complementary', { name: 'Denne måneden' })
// Role and accessible name for the dots come with keyboard support in #21
const dots = (page: Page) => page.getByTestId('prikk')
const stored = (page: Page) => page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)

// Starts with one stored todo, so we can see that nothing is lost or added
async function open(page: Page) {
  await page.clock.setFixedTime(new Date('2026-10-27T12:00:00'))
  await page.addInitScript({
    content: `if (sessionStorage.getItem('seeded') === null) {
      localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${JSON.stringify(JSON.stringify(EXISTING))})
      sessionStorage.setItem('seeded', '1')
    }`,
  })
  await page.goto('./')
  await expect(dots(page)).toHaveCount(1)
}

async function openForm(page: Page) {
  await addButton(page).click()
  await expect(form(page)).toBeVisible()
}

async function fill(page: Page, title: string, date: string, description = '') {
  await form(page).getByLabel('Tittel').fill(title)
  await form(page).getByLabel('Beskrivelse').fill(description)
  await form(page).getByLabel('Dato 1', { exact: true }).fill(date)
}

async function expectNothingSaved(page: Page) {
  expect(JSON.parse((await stored(page)) ?? 'null')).toEqual(EXISTING)
  await expect(dots(page)).toHaveCount(1)
}

test('«+ Legg til nytt gjøremål» åpner et skjema med tittel, valgfri beskrivelse og én dato', async ({ page }) => {
  await open(page)
  await expect(form(page)).toHaveCount(0)
  await openForm(page)
  await expect(form(page).getByLabel('Tittel')).toBeEditable()
  await expect(form(page).getByLabel('Beskrivelse (valgfri)')).toBeEditable()
  await expect(form(page).getByLabel(/^Dato/)).toHaveCount(1)
  await expect(form(page).getByLabel('Dato 1', { exact: true })).toHaveAttribute('placeholder', 'dd.mm')
  await expect(form(page).getByRole('button', { name: 'Velg dato 1 i kalender' })).toBeVisible()
  await expect(form(page).getByText('Skriv dd.mm (eller dd/mm, dd-mm), eller velg i kalenderen.', { exact: false })).toBeVisible()
  await expect(form(page).getByLabel('Tittel')).toBeFocused()
})

test('uten tittel vises «Tittel er påkrevd.» ved feltet, og ingenting lagres', async ({ page }) => {
  await open(page)
  await openForm(page)
  await fill(page, '   ', '15.10')
  await form(page).getByRole('button', { name: 'Lagre' }).click()
  await expect(form(page).getByLabel('Tittel')).toHaveAccessibleDescription('Tittel er påkrevd.')
  await expect(form(page).getByLabel('Tittel')).toHaveAttribute('aria-invalid', 'true')
  await expect(form(page)).toBeVisible()
  await expectNothingSaved(page)
})

test('uten dato vises «Minst én dato er påkrevd.», og ingenting lagres', async ({ page }) => {
  await open(page)
  await openForm(page)
  await fill(page, 'Dekkskift', '')
  await form(page).getByRole('button', { name: 'Lagre' }).click()
  await expect(form(page).getByLabel('Dato 1', { exact: true })).toHaveAccessibleDescription(/Minst én dato er påkrevd\./)
  await expect(form(page).getByText('Minst én dato er påkrevd.')).toBeVisible()
  await expect(form(page)).toBeVisible()
  await expectNothingSaved(page)
})

test('et gyldig gjøremål lagres og vises med en gang på hjulet og i sidekolonnen', async ({ page }) => {
  await open(page)
  await openForm(page)
  await fill(page, 'Dekkskift', '15/10', 'Bytt til vinterdekk.')
  await form(page).getByRole('button', { name: 'Lagre' }).click()

  await expect(form(page)).toHaveCount(0)
  await expect(dots(page)).toHaveCount(2)
  const card = column(page).getByRole('article').filter({ has: page.getByRole('heading', { name: 'Dekkskift' }) })
  await expect(card.getByText('15. okt', { exact: true })).toBeVisible()
  await expect(card.getByText('Bytt til vinterdekk.')).toBeVisible()

  // Still there after a reload, next to the todo that was there before
  await page.reload()
  await expect(dots(page)).toHaveCount(2)
  await expect(card).toBeVisible()
  const todos = JSON.parse((await stored(page)) ?? '[]') as { title: string; dates: unknown }[]
  expect(todos.map((todo) => todo.title)).toEqual(['Vårvask av garasjen', 'Dekkskift'])
  expect(todos[1]?.dates).toEqual([{ month: 10, day: 15 }])
})

test('«Avbryt» lukker uten å lagre', async ({ page }) => {
  await open(page)
  await openForm(page)
  await fill(page, 'Dekkskift', '15.10')
  await form(page).getByRole('button', { name: 'Avbryt' }).click()
  await expect(form(page)).toHaveCount(0)
  await expect(column(page).getByText('Dekkskift')).toHaveCount(0)
  await expectNothingSaved(page)

  await openForm(page)
  await expect(form(page).getByLabel('Tittel')).toHaveValue('')
})

test('ugyldig dato og for lang tekst gir melding, og ingenting lagres', async ({ page }) => {
  await open(page)
  await openForm(page)
  await fill(page, 'a'.repeat(61), '31.04', 'b'.repeat(501))
  await form(page).getByRole('button', { name: 'Lagre' }).click()
  await expect(form(page).getByLabel('Tittel')).toHaveAccessibleDescription('Tittelen kan ha maks 60 tegn.')
  await expect(form(page).getByLabel('Beskrivelse (valgfri)')).toHaveAccessibleDescription('Beskrivelsen kan ha maks 500 tegn.')
  await expect(form(page).getByLabel('Dato 1', { exact: true })).toHaveAccessibleDescription(
    /Skriv datoen som dd\.mm, for eksempel 15\.05\./,
  )
  await expectNothingSaved(page)
})
