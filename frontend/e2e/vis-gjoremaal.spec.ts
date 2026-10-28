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
]

const view = (page: Page) => page.getByRole('dialog', { name: 'Rense takrennene' })
const column = (page: Page) => page.getByRole('complementary', { name: 'Denne måneden' })
const dots = (page: Page) => page.getByRole('group', { name: 'Årshjul med gjøremål' }).getByRole('button')
const stored = (page: Page) => page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)

async function open(page: Page) {
  await page.clock.setFixedTime(new Date('2026-10-27T12:00:00'))
  await page.addInitScript({
    content: `localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${JSON.stringify(JSON.stringify(TODOS))})`,
  })
  await page.goto('./')
  await expect(dots(page)).toHaveCount(3)
}

async function expectAllDetails(page: Page) {
  await expect(view(page).getByRole('heading', { level: 2 })).toHaveText('Rense takrennene')
  await expect(view(page).getByText(/^\d+\. \w+$/)).toHaveText(['20. mar', '1. jun', '28. okt'])
  await expect(view(page).getByText('Begge sider av huset.')).toBeVisible()
}

test('klikk på en prikk åpner en dialog med tittel, alle datoer og beskrivelse', async ({ page }) => {
  await open(page)
  await expect(view(page)).toHaveCount(0)
  // Every one of the three dots opens the same todo with all its dates
  for (let i = 0; i < 3; i++) {
    await dots(page).nth(i).click()
    await expect(view(page)).toBeVisible()
    await expectAllDetails(page)
    await view(page).getByRole('button', { name: 'Lukk' }).click()
    await expect(view(page)).toHaveCount(0)
  }
})

test('klikk på et kort åpner samme dialog', async ({ page }) => {
  await open(page)
  await column(page).getByRole('article').click()
  await expect(view(page)).toBeVisible()
  await expectAllDetails(page)
})

test('dialogen viser «Gjentas automatisk hvert år» og lukkes med lukkeknapp eller klikk utenfor', async ({ page }) => {
  await open(page)
  const before = await stored(page)

  await dots(page).first().click()
  await expect(view(page).getByText('↻ Gjentas automatisk hvert år')).toBeVisible()
  await view(page).getByRole('button', { name: 'Lukk' }).click()
  await expect(view(page)).toHaveCount(0)

  // A click inside the dialog keeps it open
  await column(page).getByRole('article').click()
  await view(page).getByText('Begge sider av huset.').click()
  await expect(view(page)).toBeVisible()

  // Top left corner, on the dark backdrop outside the dialog
  await page.mouse.click(10, 10)
  await expect(view(page)).toHaveCount(0)
  expect(await stored(page)).toBe(before)
})
