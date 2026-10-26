import { expect, test, type Locator, type Page } from '@playwright/test'

const wheel = (page: Page) => page.getByRole('group', { name: 'Årshjul med gjøremål' })
// The ring is decoration without role, so it is found by test id
const todayMarker = (page: Page) => page.getByTestId('dagens-dato')

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

// Middle of the day: 26 October 2026 is day 299 of 365 (index 298)
const ANGLE_26_OCTOBER = (298.5 / 365) * 360
const ANGLE_27_OCTOBER = (299.5 / 365) * 360

test('dagens dato har alltid datotall', async ({ page }) => {
  // An ordinary day gets a number it would not otherwise have
  await page.clock.setFixedTime(new Date('2026-10-26T12:00:00'))
  await page.goto('./')
  await expect(wheel(page).getByText('26', { exact: true })).toBeVisible()
  await expect(todayMarker(page)).toHaveText('26')

  // On the 20th the number is shown once, in the ring
  await page.clock.setFixedTime(new Date('2026-10-20T12:00:00'))
  await page.reload()
  await expect(wheel(page).getByText('20', { exact: true })).toHaveCount(12)
  await expect(todayMarker(page)).toHaveText('20')
})

test('en ring vises rundt dagens datotall og ingen andre steder', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-26T12:00:00'))
  await page.goto('./')
  await expect(todayMarker(page)).toHaveCount(1)
  await expect(todayMarker(page)).toHaveText('26')
  expect(Math.abs((await angleOf(page, todayMarker(page))) - ANGLE_26_OCTOBER)).toBeLessThan(1)
})

test('ringen flytter seg til ny dato ved midnatt mens siden står åpen', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-26T23:59:50') })
  await page.goto('./')
  await expect(todayMarker(page)).toHaveText('26')
  const before = await angleOf(page, todayMarker(page))
  expect(Math.abs(before - ANGLE_26_OCTOBER)).toBeLessThan(1)

  // 10 seconds to midnight, plus a little margin
  await page.clock.runFor(11_000)

  await expect(todayMarker(page)).toHaveText('27')
  await expect(todayMarker(page)).toHaveCount(1)
  const after = await angleOf(page, todayMarker(page))
  expect(Math.abs(after - ANGLE_27_OCTOBER)).toBeLessThan(1)
  expect(after).toBeGreaterThan(before)
  await expect(page.getByText('27.', { exact: true })).toBeVisible()
  await expect(page.getByText('tirsdag', { exact: true })).toBeVisible()
})

test('senterfeltet viser dagens dato med dag, måned og ukedag', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-26T12:00:00'))
  await page.goto('./')
  await expect(page.getByText('26.', { exact: true })).toBeVisible()
  await expect(page.getByText('oktober', { exact: true })).toBeVisible()
  await expect(page.getByText('mandag', { exact: true })).toBeVisible()
})
