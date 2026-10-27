import { expect, test, type Page } from '@playwright/test'

const STORAGE_KEY = 'aarhjul:v1:todos'

const TODOS = [
  {
    id: 'c3',
    title: 'Rense takrennene',
    description: 'Begge sider av huset.',
    dates: [
      { month: 10, day: 28 },
      { month: 3, day: 20 },
      { month: 6, day: 1 },
    ],
    createdAt: '2026-01-02T09:00:00.000Z',
  },
  {
    id: 'a1',
    title: 'Dekkskift',
    description: '',
    dates: [{ month: 10, day: 15 }],
    createdAt: '2026-02-03T10:00:00.000Z',
  },
]

const column = (page: Page) => page.getByRole('complementary', { name: 'Denne måneden' })
const card = (page: Page, title: string) =>
  column(page).getByRole('article').filter({ has: page.getByRole('heading', { name: title, exact: true }) })
const editForm = (page: Page) => page.getByRole('dialog', { name: 'Rediger gjøremål' })
const dateField = (page: Page, n: number) => editForm(page).getByLabel(`Dato ${String(n)}`, { exact: true })
// Role and accessible name for the dots come with keyboard support in #21
const dots = (page: Page) => page.getByTestId('prikk')
const stored = (page: Page) => page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)

// Stored only on the first load, so a reload shows what the app saved
async function open(page: Page) {
  await page.clock.setFixedTime(new Date('2026-10-27T12:00:00'))
  await page.addInitScript({
    content: `if (sessionStorage.getItem('seeded') === null) {
      localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${JSON.stringify(JSON.stringify(TODOS))})
      sessionStorage.setItem('seeded', '1')
    }`,
  })
  await page.goto('./')
  await expect(dots(page)).toHaveCount(4)
}

async function expectFilledIn(page: Page) {
  await expect(editForm(page).getByLabel('Tittel')).toHaveValue('Rense takrennene')
  await expect(editForm(page).getByLabel('Beskrivelse')).toHaveValue('Begge sider av huset.')
  await expect(editForm(page).getByLabel(/^Dato \d+$/)).toHaveCount(3)
  await expect(dateField(page, 1)).toHaveValue('20.03')
  await expect(dateField(page, 2)).toHaveValue('01.06')
  await expect(dateField(page, 3)).toHaveValue('28.10')
}

test('«Rediger» på kortet og i dialogen åpner skjemaet med utfylte verdier', async ({ page }) => {
  await open(page)
  await card(page, 'Rense takrennene').getByRole('button', { name: 'Rediger «Rense takrennene»' }).click()
  await expect(editForm(page)).toBeVisible()
  await expect(page.getByRole('dialog', { name: 'Rense takrennene' })).toHaveCount(0)
  await expectFilledIn(page)
  await editForm(page).getByRole('button', { name: 'Avbryt' }).click()

  await card(page, 'Rense takrennene').getByRole('heading').click()
  await page.getByRole('dialog', { name: 'Rense takrennene' }).getByRole('button', { name: 'Rediger' }).click()
  await expect(page.getByRole('dialog', { name: 'Rense takrennene' })).toHaveCount(0)
  await expect(editForm(page)).toBeVisible()
  await expectFilledIn(page)
})

test('samme regler som ved oppretting gjelder', async ({ page }) => {
  await open(page)
  const before = await stored(page)
  await card(page, 'Rense takrennene').getByRole('button', { name: /^Rediger/ }).click()

  await editForm(page).getByLabel('Tittel').fill('')
  await dateField(page, 2).fill('28/10')
  await dateField(page, 1).fill('31.04')
  await editForm(page).getByRole('button', { name: 'Lagre' }).click()

  await expect(editForm(page).getByLabel('Tittel')).toHaveAccessibleDescription('Tittel er påkrevd.')
  await expect(dateField(page, 1)).toHaveAccessibleDescription('Skriv datoen som dd.mm, for eksempel 15.05.')
  await expect(dateField(page, 3)).toHaveAccessibleDescription('28. oktober er allerede lagt inn på dette gjøremålet.')
  await expect(editForm(page)).toBeVisible()
  expect(await stored(page)).toBe(before)
})

test('«Lagre» oppdaterer lagringen, hjulet og sidekolonnen, og id og opprettelsestidspunkt beholdes', async ({ page }) => {
  await open(page)
  await card(page, 'Dekkskift').getByRole('button', { name: 'Rediger «Dekkskift»' }).click()
  await editForm(page).getByLabel('Tittel').fill('Dekkskift til vinter')
  await editForm(page).getByRole('button', { name: '+ Legg til ekstra dato' }).click()
  await dateField(page, 2).fill('01.04')
  await editForm(page).getByRole('button', { name: 'Lagre' }).click()

  await expect(editForm(page)).toHaveCount(0)
  await expect(dots(page)).toHaveCount(5)
  await expect(card(page, 'Dekkskift til vinter')).toBeVisible()
  await expect(card(page, 'Dekkskift')).toHaveCount(0)

  const todos = JSON.parse((await stored(page)) ?? '[]') as unknown[]
  expect(todos).toEqual([
    TODOS[0],
    {
      id: 'a1',
      title: 'Dekkskift til vinter',
      description: '',
      dates: [
        { month: 10, day: 15 },
        { month: 4, day: 1 },
      ],
      createdAt: '2026-02-03T10:00:00.000Z',
    },
  ])

  await page.reload()
  await expect(card(page, 'Dekkskift til vinter')).toBeVisible()
  await expect(dots(page)).toHaveCount(5)
})

test('«Avbryt» lukker uten endringer', async ({ page }) => {
  await open(page)
  const before = await stored(page)
  await card(page, 'Dekkskift').getByRole('button', { name: 'Rediger «Dekkskift»' }).click()
  await editForm(page).getByLabel('Tittel').fill('Noe helt annet')
  await editForm(page).getByLabel('Dato 1', { exact: true }).fill('01.01')
  await editForm(page).getByRole('button', { name: 'Avbryt' }).click()

  await expect(editForm(page)).toHaveCount(0)
  expect(await stored(page)).toBe(before)
  await expect(card(page, 'Dekkskift')).toBeVisible()
  await expect(column(page).getByText('Noe helt annet')).toHaveCount(0)
  await expect(dots(page)).toHaveCount(4)
})
