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
const confirm = (page: Page) => page.getByRole('dialog', { name: 'Er du sikker?' })
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

const QUESTION = '«Rense takrennene» slettes. Dette kan ikke angres.'

test('«Slett» på kortet og i dialogen viser «Er du sikker?» med gjøremålets tittel', async ({ page }) => {
  await open(page)
  await card(page, 'Rense takrennene').getByRole('button', { name: 'Slett «Rense takrennene»' }).click()
  await expect(confirm(page)).toBeVisible()
  await expect(confirm(page).getByRole('heading', { level: 2 })).toHaveText('Er du sikker?')
  await expect(confirm(page).getByText(QUESTION)).toBeVisible()
  await expect(page.getByRole('dialog', { name: 'Rense takrennene' })).toHaveCount(0)
  await confirm(page).getByRole('button', { name: 'Avbryt' }).click()

  await card(page, 'Rense takrennene').getByRole('heading').click()
  await page.getByRole('dialog', { name: 'Rense takrennene' }).getByRole('button', { name: 'Slett' }).click()
  await expect(page.getByRole('dialog', { name: 'Rense takrennene' })).toHaveCount(0)
  await expect(confirm(page)).toBeVisible()
  await expect(confirm(page).getByText(QUESTION)).toBeVisible()
})

test('«Ja, slett» fjerner gjøremålet fra lagringen, hjulet og sidekolonnen', async ({ page }) => {
  await open(page)
  await card(page, 'Rense takrennene').getByRole('button', { name: 'Slett «Rense takrennene»' }).click()
  await confirm(page).getByRole('button', { name: 'Ja, slett' }).click()

  await expect(confirm(page)).toHaveCount(0)
  await expect(dots(page)).toHaveCount(1)
  await expect(card(page, 'Rense takrennene')).toHaveCount(0)
  await expect(card(page, 'Dekkskift')).toBeVisible()
  expect(JSON.parse((await stored(page)) ?? 'null')).toEqual([TODOS[1]])

  await page.reload()
  await expect(dots(page)).toHaveCount(1)
  await expect(card(page, 'Rense takrennene')).toHaveCount(0)
})

test('«Avbryt» lar gjøremålet være uendret', async ({ page }) => {
  await open(page)
  const before = await stored(page)

  await card(page, 'Dekkskift').getByRole('button', { name: 'Slett «Dekkskift»' }).click()
  await confirm(page).getByRole('button', { name: 'Avbryt' }).click()
  await expect(confirm(page)).toHaveCount(0)

  await card(page, 'Dekkskift').getByRole('button', { name: 'Slett «Dekkskift»' }).click()
  await confirm(page).getByRole('button', { name: 'Lukk' }).click()
  await expect(confirm(page)).toHaveCount(0)

  expect(await stored(page)).toBe(before)
  await expect(dots(page)).toHaveCount(4)
  await expect(card(page, 'Dekkskift')).toBeVisible()
  await expect(card(page, 'Rense takrennene')).toBeVisible()
})
