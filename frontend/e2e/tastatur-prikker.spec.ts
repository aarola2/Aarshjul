import { expect, test, type Page } from '@playwright/test'

const STORAGE_KEY = 'aarhjul:v1:todos'
// The text colour from the design, #1d2624, used for the focus ring
const RING_COLOUR = 'rgb(29, 38, 36)'

const todo = (id: string, title: string, ...dates: [number, number][]) => ({
  id,
  title,
  description: '',
  dates: dates.map(([month, day]) => ({ month, day })),
  createdAt: '2026-01-02T09:00:00.000Z',
})

// Stored in an order that differs from the calendar
const TODOS = [
  todo('a1', 'Dekkskift', [4, 15], [10, 15]),
  todo('b2', 'Vårvask av garasjen', [5, 15]),
  todo('c3', 'Rense takrennene', [3, 20], [6, 1]),
]
const CALENDAR_ORDER = [
  'Rense takrennene, 20. mars',
  'Dekkskift, 15. april',
  'Vårvask av garasjen, 15. mai',
  'Rense takrennene, 1. juni',
  'Dekkskift, 15. oktober',
]

const dot = (page: Page, name: string) => page.getByRole('button', { name, exact: true })
// Run in the browser; the e2e tests are type-checked without the DOM types
const focusedLabel = async (page: Page) =>
  String(await page.evaluate('document.activeElement?.getAttribute("aria-label") ?? ""'))

async function open(page: Page, now = '2026-10-27T12:00:00', todos: unknown[] = TODOS) {
  await page.clock.setFixedTime(new Date(now))
  await page.addInitScript({
    content: `localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${JSON.stringify(JSON.stringify(todos))})`,
  })
  await page.goto('./')
}

// Tab from the top of the page until the dot has focus
async function tabTo(page: Page, name: string) {
  for (let i = 0; i < 20 && (await focusedLabel(page)) !== name; i++) await page.keyboard.press('Tab')
  await expect(dot(page, name)).toBeFocused()
}

test('alle prikker kan nås med Tab', async ({ page }) => {
  await open(page)
  const visited: string[] = []
  // One round through the page: Tab wraps around, so stop when a dot comes back
  for (let i = 0; i < 30; i++) {
    await page.keyboard.press('Tab')
    const label = await focusedLabel(page)
    if (visited.includes(label)) break
    if (CALENDAR_ORDER.includes(label)) visited.push(label)
  }
  // Every dot once, in calendar order from January
  expect(visited).toEqual(CALENDAR_ORDER)
})

test('Enter og mellomrom på en prikk åpner dialogen', async ({ page }) => {
  await open(page)
  await tabTo(page, 'Vårvask av garasjen, 15. mai')
  await page.keyboard.press('Enter')
  const view = page.getByRole('dialog', { name: 'Vårvask av garasjen' })
  await expect(view).toBeVisible()
  await view.getByRole('button', { name: 'Lukk' }).click()
  await expect(view).toHaveCount(0)

  await dot(page, 'Dekkskift, 15. oktober').focus()
  await page.keyboard.press(' ')
  await expect(page.getByRole('dialog', { name: 'Dekkskift' })).toBeVisible()
})

test('hver prikk leses opp som «Tittel, dato»', async ({ page }) => {
  await open(page)
  for (const name of CALENDAR_ORDER) await expect(dot(page, name)).toHaveCount(1)
  await expect(dot(page, 'Vårvask av garasjen, 15. mai')).toBeVisible()

  // 29 February is read out as the day it is shown on
  await open(page, '2026-02-10T12:00:00', [todo('s1', 'Skuddårsdugnad', [2, 29])])
  await expect(dot(page, 'Skuddårsdugnad, 28. februar')).toHaveCount(1)
})

test('prikk i fokus har synlig fokusring og viser tittelen', async ({ page }) => {
  await open(page)
  const target = dot(page, 'Dekkskift, 15. april')
  const ring = target.getByTestId('fokusring')
  await expect(ring).toHaveCSS('stroke', 'none')

  await tabTo(page, 'Dekkskift, 15. april')
  await expect(ring).toHaveCSS('stroke', RING_COLOUR)
  await expect(page.getByRole('tooltip')).toHaveText('Dekkskift')

  // Moving on hides the title and the ring
  await page.keyboard.press('Tab')
  await expect(ring).toHaveCSS('stroke', 'none')
  await expect(page.getByRole('tooltip')).not.toHaveText('Dekkskift')
})
