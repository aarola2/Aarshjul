import { expect, test, type Page } from '@playwright/test'

const STORAGE_KEY = 'aarhjul:v1:todos'

const todo = (id: string, title: string, ...dates: [number, number][]) => ({
  id,
  title,
  description: '',
  dates: dates.map(([month, day]) => ({ month, day })),
  createdAt: '2026-01-02T09:00:00.000Z',
})

// These ids all hash to the same starting slot, so they compete for one place and the result
// would depend on the order in storage if placement were not derived from the id
const SAME_DATE = [
  todo('t3', 'Dekkskift', [10, 15]),
  todo('tc', 'Bytte filter i ventilasjonen', [10, 15]),
  todo('to', 'Lufte dyner', [10, 15]),
]

const wheel = (page: Page) => page.getByRole('group', { name: 'Årshjul med gjøremål' })
// Role and accessible name for the dots come with keyboard support in #21
const dots = (page: Page) => page.getByTestId('prikk')

async function openWith(page: Page, todos: unknown[]) {
  await page.clock.setFixedTime(new Date('2026-10-26T12:00:00'))
  await page.addInitScript({
    content: `localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${JSON.stringify(JSON.stringify(todos))})`,
  })
  await page.goto('./')
}

// Centre of each dot relative to the centre of the wheel, rounded to 0.1 px
async function dotPositions(page: Page) {
  const wheelBox = await wheel(page).boundingBox()
  if (!wheelBox) throw new Error('Hjulet er ikke synlig')
  const centre = { x: wheelBox.x + wheelBox.width / 2, y: wheelBox.y + wheelBox.height / 2 }
  const positions = []
  for (const dot of await dots(page).all()) {
    const box = await dot.boundingBox()
    if (!box) throw new Error('Prikken er ikke synlig')
    const x = box.x + box.width / 2 - centre.x
    const y = box.y + box.height / 2 - centre.y
    positions.push({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, size: box.width })
  }
  return positions
}

const asSortedKeys = (positions: { x: number; y: number }[]) =>
  positions.map(({ x, y }) => `${String(x)},${String(y)}`).sort()

// Which title sits where: the title is read from the tooltip of each dot
async function positionsByTitle(page: Page) {
  const positions = await dotPositions(page)
  const byTitle: Record<string, string> = {}
  for (const [i, dot] of (await dots(page).all()).entries()) {
    await dot.hover()
    const title = (await page.getByRole('tooltip').textContent()) ?? ''
    const position = positions[i]
    byTitle[title] = position ? `${String(position.x)},${String(position.y)}` : ''
  }
  return byTitle
}

test('flere gjøremål på samme dato får ulik plassering langs datoens linje', async ({ page }) => {
  await openWith(page, SAME_DATE)
  await expect(dots(page)).toHaveCount(3)
  const positions = await dotPositions(page)
  // Middle of 15 October 2026 (day index 287 of 365), in degrees from 12 o'clock
  const expectedAngle = (287.5 / 365) * 360
  for (const { x, y } of positions) {
    const angle = ((Math.atan2(x, -y) * 180) / Math.PI + 360) % 360
    expect(Math.abs(angle - expectedAngle)).toBeLessThan(0.2)
  }
  // No two dots overlap: the centres are at least one dot apart
  for (const [i, a] of positions.entries()) {
    for (const b of positions.slice(i + 1)) {
      expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(a.size)
    }
  }
})

test('plasseringen utledes fra id og er lik etter ny innlasting', async ({ page }) => {
  await openWith(page, SAME_DATE)
  await expect(dots(page)).toHaveCount(3)
  const before = await positionsByTitle(page)
  expect(Object.keys(before)).toHaveLength(3)
  await page.reload()
  await expect(dots(page)).toHaveCount(3)
  expect(await positionsByTitle(page)).toEqual(before)
})

test('plasseringen er den samme når gjøremålene er lagret i en annen rekkefølge', async ({ page, browser }) => {
  await openWith(page, SAME_DATE)
  await expect(dots(page)).toHaveCount(3)
  const before = await positionsByTitle(page)
  const other = await browser.newPage()
  await openWith(other, [...SAME_DATE].reverse())
  await expect(dots(other)).toHaveCount(3)
  expect(await positionsByTitle(other)).toEqual(before)
  await other.close()
})

test('to prikker får aldri samme plassering, også ved mange gjøremål på samme dato', async ({ page }) => {
  const many = Array.from({ length: 30 }, (_, i) => todo(`m${String(i)}`, `Gjøremål ${String(i + 1)}`, [5, 17]))
  await openWith(page, many)
  await expect(dots(page)).toHaveCount(30)
  const keys = asSortedKeys(await dotPositions(page))
  expect(new Set(keys).size).toBe(30)
})
