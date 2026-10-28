import { type BrowserContext, expect, test, type Page } from '@playwright/test'

const STORAGE_KEY = 'aarhjul:v1:todos'
const COPY_KEY = 'aarhjul:v1:corrupt-copy'
const LIMIT = 'Du kan ha maks 250 gjøremål. Slett et gjøremål før du legger til et nytt.'

const todo = (id: string, title: string, month: number, day: number) => ({
  id,
  title,
  description: '',
  dates: [{ month, day }],
  createdAt: '2026-01-02T09:00:00.000Z',
})
// One todo in October, so it has a card; the rest in January
const todos = (count: number) =>
  Array.from({ length: count }, (_, i) =>
    i === 0 ? todo('id-0', 'Dekkskift', 10, 15) : todo(`id-${String(i)}`, `Gjøremål ${String(i)}`, 1, 1 + (i % 28)),
  )

const column = (page: Page) => page.getByRole('complementary', { name: 'Denne måneden' })
const dots = (page: Page) => page.getByRole('group', { name: 'Årshjul med gjøremål' }).getByRole('button')
const form = (page: Page, name: string) => page.getByRole('dialog', { name })
const read = (page: Page, key: string) => page.evaluate((k) => localStorage.getItem(k), key)
const storedCount = async (page: Page) => (JSON.parse((await read(page, STORAGE_KEY)) ?? '[]') as unknown[]).length

// Stored only before the first load, so a reload shows what the app did with it
async function openWith(page: Page, raw: string) {
  await page.clock.setFixedTime(new Date('2026-10-27T12:00:00'))
  await page.addInitScript({
    content: `if (sessionStorage.getItem('seeded') === null) {
      localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${JSON.stringify(raw)})
      sessionStorage.setItem('seeded', '1')
    }`,
  })
  await page.goto('./')
}

async function openTab(context: BrowserContext) {
  const page = await context.newPage()
  await page.clock.setFixedTime(new Date('2026-10-27T12:00:00'))
  await page.goto('./')
  return page
}

async function expectTreatedAsCorrupt(page: Page, raw: string) {
  await expect(page.getByRole('alert')).toContainText('Lagrede data var ødelagt.')
  await expect(dots(page)).toHaveCount(0)
  await expect(column(page).getByRole('article')).toHaveCount(0)
  expect(await read(page, COPY_KEY)).toBe(raw)
}

test('lagrede data over grensen behandles som ødelagte, ved oppstart og fra en annen fane', async ({
  page,
  context,
}) => {
  const tooMany = JSON.stringify(todos(251))
  await openWith(page, tooMany)
  await expectTreatedAsCorrupt(page, tooMany)

  const longId = JSON.stringify([todo('a'.repeat(65), 'Dekkskift', 10, 15)])
  await page.evaluate(([key, value]) => {
    localStorage.setItem(key, value)
  }, [STORAGE_KEY, longId] as const)
  await page.reload()
  await expectTreatedAsCorrupt(page, longId)

  // The first tab starts again from one valid todo, so the change is visible
  await page.evaluate(
    ([key, value, copyKey]) => {
      localStorage.setItem(key, value)
      localStorage.removeItem(copyKey)
    },
    [STORAGE_KEY, JSON.stringify(todos(1)), COPY_KEY] as const,
  )
  await page.reload()
  await expect(dots(page)).toHaveCount(1)
  await expect(page.getByRole('alert')).toHaveCount(0)

  // A second tab writes too many; the first tab gets a storage event and checks them like at start
  const other = await openTab(context)
  await other.evaluate(([key, value]) => {
    localStorage.setItem(key, value)
  }, [STORAGE_KEY, tooMany] as const)
  await expectTreatedAsCorrupt(page, tooMany)
})

test('skjemaet sier fra og lagrer ikke når grensen på 250 er nådd, men redigering virker', async ({ page }) => {
  await openWith(page, JSON.stringify(todos(250)))
  await expect(dots(page)).toHaveCount(250)

  await page.getByRole('button', { name: '+ Legg til nytt gjøremål' }).click()
  await expect(form(page, 'Nytt gjøremål').getByRole('alert')).toHaveText(LIMIT)
  await form(page, 'Nytt gjøremål').getByLabel('Tittel').fill('Ett for mye')
  await form(page, 'Nytt gjøremål').getByLabel('Dato 1', { exact: true }).fill('20.10')
  await form(page, 'Nytt gjøremål').getByRole('button', { name: 'Lagre' }).click()
  await expect(form(page, 'Nytt gjøremål')).toBeVisible()
  await test.info().attach('melding om grensen', { body: await page.screenshot(), contentType: 'image/png' })
  await expect(dots(page)).toHaveCount(250)
  expect(await storedCount(page)).toBe(250)
  await form(page, 'Nytt gjøremål').getByRole('button', { name: 'Avbryt' }).click()

  await column(page).getByRole('button', { name: 'Rediger «Dekkskift»' }).click()
  await expect(form(page, 'Rediger gjøremål').getByRole('alert')).toHaveCount(0)
  await form(page, 'Rediger gjøremål').getByLabel('Tittel').fill('Dekkskift til vinter')
  await form(page, 'Rediger gjøremål').getByRole('button', { name: 'Lagre' }).click()
  await expect(column(page).getByRole('heading', { name: 'Dekkskift til vinter' })).toBeVisible()
  expect(await storedCount(page)).toBe(250)
})
