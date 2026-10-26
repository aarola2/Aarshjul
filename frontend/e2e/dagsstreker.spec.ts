import { expect, test, type Locator, type Page } from '@playwright/test'

const wheel = (page: Page) => page.getByRole('group', { name: 'Årshjul med gjøremål' })
// The ticks are decoration without role or text, so they are found by test id
const ticks = (page: Page) => page.getByTestId('dagsstreker').locator('line')

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

test.describe('i et vanlig år', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-03-15T12:00:00'))
    await page.goto('./')
  })

  test('én strek per dag', async ({ page }) => {
    await expect(ticks(page)).toHaveCount(365)
  })

  test('den 1., 10. og 20. i hver måned har datotall', async ({ page }) => {
    for (const day of ['1', '10', '20']) {
      const numbers = page.getByText(day, { exact: true })
      await expect(numbers).toHaveCount(12)
      for (const number of await numbers.all()) await expect(number).toBeVisible()
    }
  })

  test('strekene står i riktig vinkel: 1. januar kl. 12, 1. juli nederst', async ({ page }) => {
    expect(await angleOf(page, ticks(page).nth(0))).toBeLessThan(3)
    // 1 July is day 182 of 2026, index 181
    expect(Math.abs((await angleOf(page, ticks(page).nth(181))) - 180)).toBeLessThan(3)
    const ones = page.getByText('1', { exact: true })
    expect(await angleOf(page, ones.nth(0))).toBeLessThan(3)
    expect(Math.abs((await angleOf(page, ones.nth(6))) - 180)).toBeLessThan(3)
    // All numbers in calendar order go clockwise
    const numbers = page.getByText(/^(1|10|20)$/)
    const angles = []
    for (const number of await numbers.all()) angles.push(await angleOf(page, number))
    expect(angles).toHaveLength(36)
    for (let i = 1; i < angles.length; i++) expect(angles[i]).toBeGreaterThan(angles[i - 1] ?? 360)
  })
})

test('i et skuddår er det én strek per dag (366)', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2024-03-15T12:00:00'))
  await page.goto('./')
  await expect(ticks(page)).toHaveCount(366)
})
