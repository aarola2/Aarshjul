import { expect, test, type Page } from '@playwright/test'

const STORAGE_KEY = 'aarhjul:v1:todos'
const EMPTY_TITLE = 'Ingen oppgaver denne måneden'

const column = (page: Page) => page.getByRole('complementary', { name: 'Denne måneden' })
const dots = (page: Page) => page.getByRole('group', { name: 'Årshjul med gjøremål' }).getByRole('button')

async function open(page: Page, now: string, todos: unknown[] = []) {
  await page.clock.setFixedTime(new Date(now))
  if (todos.length > 0) {
    await page.addInitScript({
      content: `if (sessionStorage.getItem('seeded') === null) {
        localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${JSON.stringify(JSON.stringify(todos))})
        sessionStorage.setItem('seeded', '1')
      }`,
    })
  }
  await page.goto('./')
}

async function addTodo(page: Page, title: string, date: string) {
  await page.getByRole('button', { name: '+ Legg til nytt gjøremål' }).click()
  const form = page.getByRole('dialog', { name: 'Nytt gjøremål' })
  await form.getByLabel('Tittel').fill(title)
  await form.getByLabel('Dato 1', { exact: true }).fill(date)
  await form.getByRole('button', { name: 'Lagre' }).click()
  await expect(form).toHaveCount(0)
}

const SPRING = [
  { id: 'v1', title: 'Vårvask', description: '', dates: [{ month: 5, day: 1 }], createdAt: '2026-01-02T09:00:00.000Z' },
]

test('uten gjøremål i måneden vises «Ingen oppgaver denne måneden»', async ({ page }) => {
  await open(page, '2026-10-27T12:00:00', SPRING)
  await expect(column(page).getByText(EMPTY_TITLE)).toBeVisible()
  await expect(column(page).getByRole('article')).toHaveCount(0)
  // The wheel still shows the todo in May
  await expect(dots(page)).toHaveCount(1)
})

test('under står «Gjøremål med en dato i [måned] dukker opp her.»', async ({ page }) => {
  await open(page, '2026-10-27T12:00:00')
  await expect(column(page).getByText('Gjøremål med en dato i oktober dukker opp her.')).toBeVisible()

  await page.clock.setFixedTime(new Date('2027-01-10T12:00:00'))
  await page.reload()
  await expect(column(page).getByRole('heading', { level: 2 })).toHaveText('Januar')
  await expect(column(page).getByText('Gjøremål med en dato i januar dukker opp her.')).toBeVisible()
})

test('teksten forsvinner når måneden har et gjøremål', async ({ page }) => {
  await open(page, '2026-10-27T12:00:00')
  await addTodo(page, 'Vårvask', '01.05')
  await expect(column(page).getByText(EMPTY_TITLE)).toBeVisible()

  await addTodo(page, 'Dekkskift', '15.10')
  await expect(column(page).getByText(EMPTY_TITLE)).toHaveCount(0)
  await expect(column(page).getByText(/dukker opp her/)).toHaveCount(0)

  // And comes back when the last card of the month is deleted
  await column(page).getByRole('button', { name: 'Slett «Dekkskift»' }).click()
  await page.getByRole('dialog', { name: 'Er du sikker?' }).getByRole('button', { name: 'Ja, slett' }).click()
  await expect(column(page).getByText(EMPTY_TITLE)).toBeVisible()
})
