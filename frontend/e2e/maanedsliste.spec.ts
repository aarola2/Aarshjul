import { expect, test, type Page } from '@playwright/test'

const STORAGE_KEY = 'aarhjul:v1:todos'

const todo = (id: string, title: string, description: string, ...dates: [number, number][]) => ({
  id,
  title,
  description,
  dates: dates.map(([month, day]) => ({ month, day })),
  createdAt: '2026-01-02T09:00:00.000Z',
})

// Stored in mixed order, so the sorting has to be done by the app
const TODOS = [
  todo('a1', 'Bestille feiing', '', [10, 20]),
  todo('b2', 'Vårvask av garasjen', '', [5, 15]),
  todo('c3', 'Rense takrennene', 'Begge sider av huset.', [10, 28], [3, 20], [10, 3]),
  todo('d4', 'Dekkskift', '', [4, 15], [10, 15]),
  todo('e5', 'Julekort', 'Skriv til familien.', [11, 1]),
  todo('f6', 'Bytte batteri i røykvarsler', '', [12, 1], [10, 26]),
]

const column = (page: Page) => page.getByRole('complementary', { name: 'Denne måneden' })
const cards = (page: Page) => column(page).getByRole('article')
const card = (page: Page, title: string) => cards(page).filter({ has: page.getByRole('heading', { name: title }) })

async function openOn(page: Page, now: string) {
  await page.clock.setFixedTime(new Date(now))
  // Stored before the app starts, as if the user had saved them earlier
  await page.addInitScript({
    content: `localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${JSON.stringify(JSON.stringify(TODOS))})`,
  })
  await page.goto('./')
}

test('bare gjøremål med minst én dato i inneværende måned vises', async ({ page }) => {
  await openOn(page, '2026-10-26T12:00:00')
  await expect(cards(page)).toHaveCount(4)
  await expect(column(page).getByText('Vårvask av garasjen')).toHaveCount(0)
  await expect(column(page).getByText('Julekort')).toHaveCount(0)

  // The first of next month shows that month instead
  await page.clock.setFixedTime(new Date('2026-11-01T00:00:01'))
  await page.reload()
  await expect(cards(page)).toHaveCount(1)
  await expect(card(page, 'Julekort')).toBeVisible()
  await expect(column(page).getByText('Rense takrennene')).toHaveCount(0)
})

test('ett kort per gjøremål med tittel, alle datoene i måneden og beskrivelse', async ({ page }) => {
  await openOn(page, '2026-10-26T12:00:00')
  const takrenner = card(page, 'Rense takrennene')
  await expect(takrenner).toHaveCount(1)
  await expect(takrenner.getByText('3. okt', { exact: true })).toBeVisible()
  await expect(takrenner.getByText('28. okt', { exact: true })).toBeVisible()
  await expect(takrenner.getByText('20. mar')).toHaveCount(0)
  await expect(takrenner.getByText('Begge sider av huset.')).toBeVisible()

  const dekkskift = card(page, 'Dekkskift')
  await expect(dekkskift.getByText('15. okt', { exact: true })).toBeVisible()
  await expect(dekkskift.getByText('15. apr')).toHaveCount(0)
  await expect(dekkskift.getByRole('paragraph')).toHaveCount(0)
})

test('kortene er sortert etter første dato i måneden, tidligst øverst', async ({ page }) => {
  await openOn(page, '2026-10-26T12:00:00')
  await expect(cards(page).getByRole('heading', { level: 3 })).toHaveText([
    'Rense takrennene',
    'Dekkskift',
    'Bestille feiing',
    'Bytte batteri i røykvarsler',
  ])
})

test('overskriften viser månedsnavnet og dagens datomerke har «I dag ·»', async ({ page }) => {
  await openOn(page, '2026-10-26T12:00:00')
  await expect(column(page).getByRole('heading', { level: 2 })).toHaveText('Oktober')
  await expect(card(page, 'Bytte batteri i røykvarsler').getByText('I dag · 26. okt', { exact: true })).toBeVisible()
  await expect(column(page).getByText(/I dag/)).toHaveCount(1)
})
