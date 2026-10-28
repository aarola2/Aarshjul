import { expect, test, type Locator, type Page } from '@playwright/test'

const STORAGE_KEY = 'aarhjul:v1:todos'

const todo = (id: string, title: string, ...dates: [number, number][]) => ({
  id,
  title,
  description: '',
  dates: dates.map(([month, day]) => ({ month, day })),
  createdAt: '2026-01-02T09:00:00.000Z',
})

const TODOS = [
  todo('a1', 'Dekkskift', [4, 15], [10, 15]),
  todo('b2', 'Vårvask av garasjen', [5, 15]),
  todo('c3', 'Rense takrennene', [3, 20], [6, 1], [9, 1]),
]

const wheel = (page: Page) => page.getByRole('group', { name: 'Årshjul med gjøremål' })
const dots = (page: Page) => wheel(page).getByRole('button')

async function openWith(page: Page, todos: unknown[]) {
  await page.clock.setFixedTime(new Date('2026-10-26T12:00:00'))
  // Stored before the app starts, as if the user had saved them earlier
  await page.addInitScript({
    content: `localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${JSON.stringify(JSON.stringify(todos))})`,
  })
  await page.goto('./')
}

async function centreOf(locator: Locator) {
  const box = await locator.boundingBox()
  if (!box) throw new Error('Elementet er ikke synlig')
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

// Angle from 12 o'clock, clockwise, in degrees 0–360
async function angleOf(page: Page, locator: Locator) {
  const centre = await centreOf(wheel(page))
  const point = await centreOf(locator)
  const degrees = (Math.atan2(point.x - centre.x, centre.y - point.y) * 180) / Math.PI
  return (degrees + 360) % 360
}

// Middle of the day in 2026 (365 days), in degrees
const expectedAngle = (month: number, day: number) => {
  const dayIndex = (Date.UTC(2026, month - 1, day) - Date.UTC(2026, 0, 1)) / 86_400_000
  return ((dayIndex + 0.5) / 365) * 360
}

test('hvert gjøremål gir én prikk per dato', async ({ page }) => {
  await openWith(page, TODOS)
  await expect(dots(page)).toHaveCount(6)
})

test('prikken ligger langs linjen for sin dato', async ({ page }) => {
  await openWith(page, TODOS)
  await expect(dots(page)).toHaveCount(6)
  const angles = []
  for (const dot of await dots(page).all()) angles.push(await angleOf(page, dot))
  const expected = TODOS.flatMap(({ dates }) => dates.map(({ month, day }) => expectedAngle(month, day)))
  const sortNumbers = (values: number[]) => [...values].sort((a, b) => a - b)
  const actual = sortNumbers(angles)
  sortNumbers(expected).forEach((angle, i) => {
    // One day is about 0.99°, so the margin must be well below that
    expect(Math.abs((actual[i] ?? NaN) - angle)).toBeLessThan(0.2)
  })
})

test('tittelen vises når musen holdes over en prikk', async ({ page }) => {
  await openWith(page, [todo('a1', 'Dekkskift', [4, 15])])
  await expect(page.getByRole('tooltip')).toBeHidden()
  await dots(page).hover()
  await expect(page.getByRole('tooltip')).toHaveText('Dekkskift')
  // The tooltip sits just above the dot, centred on it
  const tip = await page.getByRole('tooltip').boundingBox()
  const dot = await dots(page).boundingBox()
  if (!tip || !dot) throw new Error('Tooltip eller prikk er ikke synlig')
  expect(tip.y + tip.height).toBeLessThanOrEqual(dot.y)
  expect(Math.abs(tip.x + tip.width / 2 - (dot.x + dot.width / 2))).toBeLessThan(1)
  const shot = test.info().outputPath('tooltip.png')
  await page.screenshot({ path: shot })
  await test.info().attach('tooltip over prikken', { path: shot, contentType: 'image/png' })
  await page.mouse.move(5, 5)
  await expect(page.getByRole('tooltip')).toBeHidden()
})
