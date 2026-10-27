import { expect, test, type Locator, type Page } from '@playwright/test'

const STORAGE_KEY = 'aarhjul:v1:todos'

const todo = (id: string, title: string, ...dates: [number, number][]) => ({
  id,
  title,
  description: '',
  dates: dates.map(([month, day]) => ({ month, day })),
  createdAt: '2026-01-02T09:00:00.000Z',
})

const form = (page: Page) => page.getByRole('dialog', { name: 'Nytt gjøremål' })
const dateField = (page: Page) => form(page).getByLabel('Dato 1', { exact: true })
const column = (page: Page) => page.getByRole('complementary', { name: 'Denne måneden' })
const wheel = (page: Page) => page.getByRole('group', { name: 'Årshjul med gjøremål' })
// Role and accessible name for the dots come with keyboard support in #21
const dots = (page: Page) => page.getByTestId('prikk')
const stored = (page: Page) => page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)

async function open(page: Page, now: string, todos: unknown[] = []) {
  await page.clock.setFixedTime(new Date(now))
  if (todos.length > 0) {
    await page.addInitScript({
      content: `localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${JSON.stringify(JSON.stringify(todos))})`,
    })
  }
  await page.goto('./')
}

async function tryToSave(page: Page, title: string, date: string) {
  await page.getByRole('button', { name: '+ Legg til nytt gjøremål' }).click()
  await form(page).getByLabel('Tittel').fill(title)
  await dateField(page).fill(date)
  await form(page).getByRole('button', { name: 'Lagre' }).click()
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

test('31. april og 30. februar avvises med melding, og ingenting lagres', async ({ page }) => {
  await open(page, '2026-10-27T12:00:00')
  for (const [date, message] of [
    ['31.04', '31. april finnes ikke i kalenderen.'],
    ['30.02', '30. februar finnes ikke i kalenderen.'],
  ] as const) {
    await tryToSave(page, 'Ugyldig', date)
    await expect(dateField(page)).toHaveAccessibleDescription(message)
    await expect(form(page).getByText(message)).toBeVisible()
    await form(page).getByRole('button', { name: 'Avbryt' }).click()
  }
  expect(await stored(page)).toBeNull()
  await expect(dots(page)).toHaveCount(0)
})

test('tekst som ikke er en dato på formen dd.mm, dd/mm eller dd-mm avvises med en tydelig melding', async ({ page }) => {
  await open(page, '2026-10-27T12:00:00')
  for (const date of ['neste uke', '15.13', '1510']) {
    await tryToSave(page, 'Ugyldig', date)
    await expect(dateField(page)).toHaveAccessibleDescription('Skriv datoen som dd.mm, for eksempel 15.05.')
    await form(page).getByRole('button', { name: 'Avbryt' }).click()
  }
  expect(await stored(page)).toBeNull()
})

test('29. februar kan lagres', async ({ page }) => {
  await open(page, '2028-02-10T12:00:00')
  await tryToSave(page, 'Skuddårsdugnad', '29.02')
  await expect(form(page)).toHaveCount(0)
  const todos = JSON.parse((await stored(page)) ?? '[]') as { dates: unknown }[]
  expect(todos[0]?.dates).toEqual([{ month: 2, day: 29 }])
  await expect(column(page).getByRole('article').getByText('29. feb', { exact: true })).toBeVisible()
  await expect(dots(page)).toHaveCount(1)
})

test('i år uten skuddår vises 29. februar som 28. februar på hjulet og i sidekolonnen', async ({ page }) => {
  // Created first, so its dot comes first in the order the dots are drawn
  const todos = [todo('a1', 'Skuddårsdugnad', [2, 29]), todo('b2', 'Vanlig februar', [2, 28])]
  const leapDot = (p: Page) => dots(p).first()
  const ordinaryDot = (p: Page) => dots(p).last()
  const card = (p: Page) =>
    column(p).getByRole('article').filter({ has: p.getByRole('heading', { name: 'Skuddårsdugnad' }) })

  await open(page, '2026-02-10T12:00:00', todos)
  await expect(card(page).getByText('28. feb', { exact: true })).toBeVisible()
  await expect(card(page).getByText('29. feb')).toHaveCount(0)
  // Same line from the centre as 28 February
  expect(Math.abs((await angleOf(page, leapDot(page))) - (await angleOf(page, ordinaryDot(page))))).toBeLessThan(0.3)

  // In a leap year it has its own day
  await page.clock.setFixedTime(new Date('2028-02-10T12:00:00'))
  await page.reload()
  await expect(card(page).getByText('29. feb', { exact: true })).toBeVisible()
  expect((await angleOf(page, leapDot(page))) - (await angleOf(page, ordinaryDot(page)))).toBeGreaterThan(0.5)
})

test('feilmeldingen forsvinner når feltet rettes', async ({ page }) => {
  await open(page, '2026-10-27T12:00:00')
  await tryToSave(page, 'Ugyldig', '31.04')
  await expect(dateField(page)).toHaveAttribute('aria-invalid', 'true')
  await expect(form(page).getByText('31. april finnes ikke i kalenderen.')).toBeVisible()

  await dateField(page).fill('30.04')
  await expect(form(page).getByText('31. april finnes ikke i kalenderen.')).toHaveCount(0)
  await expect(dateField(page)).toHaveAttribute('aria-invalid', 'false')
  expect(await stored(page)).toBeNull()
})
