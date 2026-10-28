import { type BrowserContext, expect, test, type Page } from '@playwright/test'

const STORAGE_KEY = 'aarhjul:v1:todos'
const COPY_KEY = 'aarhjul:v1:corrupt-copy'

const todo = (id: string, title: string, month: number, day: number) => ({
  id,
  title,
  description: '',
  dates: [{ month, day }],
  createdAt: '2026-01-02T09:00:00.000Z',
})
const DEKKSKIFT = todo('a1', 'Dekkskift', 10, 15)

const column = (page: Page) => page.getByRole('complementary', { name: 'Denne måneden' })
const card = (page: Page, title: string) =>
  column(page).getByRole('article').filter({ has: page.getByRole('heading', { name: title, exact: true }) })
// The title is matched as plain text, so characters like ( and . in it have no special meaning
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const dotsOf = (page: Page, title: string) =>
  page.getByRole('button', { name: new RegExp(`^${escapeRegExp(title)}, `) })
const form = (page: Page, name: string) => page.getByRole('dialog', { name })
const confirm = (page: Page) => page.getByRole('dialog', { name: 'Er du sikker?' })
const read = (page: Page, key: string) => page.evaluate((k) => localStorage.getItem(k), key)
const storedTitles = async (page: Page) =>
  (JSON.parse((await read(page, STORAGE_KEY)) ?? '[]') as { title: string }[]).map((t) => t.title)

async function openTab(context: BrowserContext) {
  const page = await context.newPage()
  await page.clock.setFixedTime(new Date('2026-10-27T12:00:00'))
  await page.goto('./')
  return page
}

// Two tabs of the app in the same browser, both started from the same stored list
async function openTwoTabs(context: BrowserContext, todos: unknown[] = []) {
  const a = await openTab(context)
  await a.evaluate(([key, value]) => {
    localStorage.setItem(key, value)
  }, [STORAGE_KEY, JSON.stringify(todos)] as const)
  await a.reload()
  const b = await openTab(context)
  return { a, b }
}

async function create(page: Page, title: string, date: string) {
  await page.getByRole('button', { name: '+ Legg til nytt gjøremål' }).click()
  await form(page, 'Nytt gjøremål').getByLabel('Tittel').fill(title)
  await form(page, 'Nytt gjøremål').getByLabel('Dato 1', { exact: true }).fill(date)
  await form(page, 'Nytt gjøremål').getByRole('button', { name: 'Lagre' }).click()
  await expect(form(page, 'Nytt gjøremål')).toHaveCount(0)
}

async function remove(page: Page, title: string) {
  await card(page, title).getByRole('button', { name: `Slett «${title}»` }).click()
  await confirm(page).getByRole('button', { name: 'Ja, slett' }).click()
  await expect(confirm(page)).toHaveCount(0)
}

test('det som opprettes, endres og slettes i én fane, vises i den andre uten ny innlasting', async ({ context }) => {
  const { a, b } = await openTwoTabs(context)

  await create(a, 'Rense takrennene', '03.10')
  await expect(dotsOf(b, 'Rense takrennene')).toHaveCount(1)
  await expect(card(b, 'Rense takrennene')).toBeVisible()

  await card(a, 'Rense takrennene').getByRole('button', { name: 'Rediger «Rense takrennene»' }).click()
  await form(a, 'Rediger gjøremål').getByLabel('Tittel').fill('Rense takrenner og nedløp')
  await form(a, 'Rediger gjøremål').getByRole('button', { name: 'Lagre' }).click()
  await expect(card(b, 'Rense takrenner og nedløp')).toBeVisible()
  await expect(card(b, 'Rense takrennene')).toHaveCount(0)

  await remove(a, 'Rense takrenner og nedløp')
  await expect(dotsOf(b, 'Rense takrenner og nedløp')).toHaveCount(0)
  await expect(column(b).getByText('Ingen oppgaver denne måneden')).toBeVisible()
})

test('ugyldige data fra en annen fane tas ikke i bruk, men gir varselet om ødelagte data', async ({ context }) => {
  const { a, b } = await openTwoTabs(context, [DEKKSKIFT])
  await expect(card(b, 'Dekkskift')).toBeVisible()

  const corrupt = '[{"id": "a1", "tittel": "Dekkskift"'
  await a.evaluate(([key, value]) => {
    localStorage.setItem(key, value)
  }, [STORAGE_KEY, corrupt] as const)

  await expect(b.getByRole('alert')).toContainText('Lagrede data var ødelagt.')
  await expect(card(b, 'Dekkskift')).toHaveCount(0)
  await expect(dotsOf(b, 'Dekkskift')).toHaveCount(0)
  expect(await read(b, COPY_KEY)).toBe(corrupt)
})

test('lagrer fane B etter en endring i fane A, beholdes endringen fra A', async ({ context }) => {
  const { a, b } = await openTwoTabs(context)

  await create(a, 'Rense takrennene', '03.10')
  await expect(card(b, 'Rense takrennene')).toBeVisible()
  await create(b, 'Dekkskift', '15.10')

  expect(await storedTitles(b)).toEqual(['Rense takrennene', 'Dekkskift'])
  for (const page of [a, b]) {
    await expect(card(page, 'Rense takrennene')).toBeVisible()
    await expect(card(page, 'Dekkskift')).toBeVisible()
  }
})

test('et skjema som er åpent for et gjøremål som slettes i den andre fanen, lukkes med en melding', async ({
  context,
}) => {
  const { a, b } = await openTwoTabs(context, [DEKKSKIFT])
  await card(b, 'Dekkskift').getByRole('button', { name: 'Rediger «Dekkskift»' }).click()
  await form(b, 'Rediger gjøremål').getByLabel('Tittel').fill('Dekkskift til vinter')

  await remove(a, 'Dekkskift')

  await expect(form(b, 'Rediger gjøremål')).toHaveCount(0)
  await expect(b.getByRole('alert')).toContainText('Gjøremålet «Dekkskift» ble slettet i en annen fane.')
  await expect(b.getByRole('button', { name: '+ Legg til nytt gjøremål' })).toBeFocused()
  await expect(card(b, 'Dekkskift til vinter')).toHaveCount(0)
  expect(await storedTitles(b)).toEqual([])
})

test('endringer i andre nøkler på samme adresse ignoreres', async ({ context }) => {
  const { a, b } = await openTwoTabs(context, [DEKKSKIFT])
  await expect(card(b, 'Dekkskift')).toBeVisible()
  // Run in the browser; the e2e tests are type-checked without the DOM types
  await b.evaluate('window.seenKeys = []; window.addEventListener("storage", (event) => window.seenKeys.push(event.key))')

  // Stored from B itself, which gets no storage event for its own writes; only reading storage again would show it
  await b.evaluate(([key, value]) => {
    localStorage.setItem(key, value)
  }, [STORAGE_KEY, JSON.stringify([todo('b2', 'Vårvask av garasjen', 10, 20)])] as const)
  await a.evaluate(() => {
    localStorage.setItem('annet-prosjekt:x', '1')
  })

  await expect.poll(() => b.evaluate('window.seenKeys')).toContain('annet-prosjekt:x')
  await expect(card(b, 'Dekkskift')).toBeVisible()
  await expect(card(b, 'Vårvask av garasjen')).toHaveCount(0)
})
