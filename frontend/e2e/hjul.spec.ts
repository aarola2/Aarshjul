import { expect, test, type Locator, type Page } from '@playwright/test'

const MONTHS = [
  'JANUAR', 'FEBRUAR', 'MARS', 'APRIL', 'MAI', 'JUNI',
  'JULI', 'AUGUST', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER',
]

const WINTER = 'rgb(227, 233, 239)' // #e3e9ef, lys gråblå
const SPRING = 'rgb(191, 220, 156)' // #bfdc9c, lys grønn
const SUMMER = 'rgb(46, 106, 66)' // #2e6a42, mørkegrønn
const AUTUMN = 'rgb(223, 138, 62)' // #df8a3e, oransje
const SEASON_COLORS = [
  WINTER, WINTER, SPRING, SPRING, SPRING, SUMMER,
  SUMMER, SUMMER, AUTUMN, AUTUMN, AUTUMN, WINTER,
]

const wheel = (page: Page) => page.getByRole('group', { name: 'Årshjul med gjøremål' })
const monthLabel = (page: Page, name: string) => page.getByText(name, { exact: true })

async function boxOf(locator: Locator) {
  const box = await locator.boundingBox()
  if (!box) throw new Error('Elementet er ikke synlig')
  return box
}

async function centreOf(locator: Locator) {
  const box = await boxOf(locator)
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

// Angle from 12 o'clock, clockwise, in degrees 0–360
async function angleOf(page: Page, name: string) {
  const centre = await centreOf(wheel(page))
  const label = await centreOf(monthLabel(page, name))
  const degrees = (Math.atan2(label.x - centre.x, centre.y - label.y) * 180) / Math.PI
  return (degrees + 360) % 360
}

test.beforeEach(async ({ page }) => {
  await page.goto('./')
})

test('hjulet står til venstre og sidekolonnen til høyre', async ({ page }) => {
  const wheelBox = await boxOf(wheel(page))
  const sideBox = await boxOf(page.getByRole('complementary', { name: 'Denne måneden' }))
  expect(wheelBox.width).toBeGreaterThan(400)
  expect(wheelBox.height).toBeGreaterThan(400)
  expect(wheelBox.x + wheelBox.width).toBeLessThanOrEqual(sideBox.x)
  expect(sideBox.width).toBeCloseTo(440, 0)
})

test('januar starter kl. 12, månedene går med klokken og juli begynner nederst', async ({ page }) => {
  const angles = []
  for (const name of MONTHS) angles.push(await angleOf(page, name))
  for (let i = 1; i < angles.length; i++) {
    expect(angles[i], `${MONTHS[i] ?? ''} kommer etter ${MONTHS[i - 1] ?? ''}`).toBeGreaterThan(angles[i - 1] ?? 0)
  }
  // The year starts at 12 o'clock: December just before, January just after
  expect(angles[11]).toBeGreaterThan(330)
  expect(angles[0]).toBeLessThan(30)
  // July starts at the bottom: June just before, July just after
  expect(angles[5]).toBeGreaterThan(150)
  expect(angles[5]).toBeLessThan(180)
  expect(angles[6]).toBeGreaterThan(180)
  expect(angles[6]).toBeLessThan(210)
})

test('alle 12 månedene er merket med navn', async ({ page }) => {
  for (const name of MONTHS) {
    await expect(monthLabel(page, name)).toBeVisible()
  }
})

test('månedene har årstidsfarger', async ({ page }) => {
  for (const [i, name] of MONTHS.entries()) {
    // The band has no role, so it is found as the shape in the same month group as the name
    const band = monthLabel(page, name).locator('xpath=ancestor::*[local-name()="g"][1]/*[local-name()="path"]')
    await expect(band, name).toHaveCSS('fill', SEASON_COLORS[i] ?? '')
  }
})
