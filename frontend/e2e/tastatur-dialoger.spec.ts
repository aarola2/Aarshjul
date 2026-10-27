import { expect, test, type Page } from '@playwright/test'

const STORAGE_KEY = 'aarhjul:v1:todos'

const TODOS = [
  {
    id: 'a1',
    title: 'Dekkskift',
    description: '',
    dates: [{ month: 10, day: 15 }],
    createdAt: '2026-01-02T09:00:00.000Z',
  },
]

const column = (page: Page) => page.getByRole('complementary', { name: 'Denne måneden' })
const addButton = (page: Page) => page.getByRole('button', { name: '+ Legg til nytt gjøremål' })
const stored = (page: Page) => page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)
// Run in the browser; the e2e tests are type-checked without the DOM types
const focusedName = async (page: Page) =>
  String(await page.evaluate('document.activeElement?.getAttribute("aria-label") || document.activeElement?.textContent || ""'))

async function open(page: Page, todos: unknown[] = []) {
  await page.clock.setFixedTime(new Date('2026-10-27T12:00:00'))
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

// Press Tab until the element with this name has focus
async function tabTo(page: Page, name: string) {
  for (let i = 0; i < 40 && (await focusedName(page)).trim() !== name; i++) await page.keyboard.press('Tab')
  expect((await focusedName(page)).trim()).toBe(name)
}

test('alle knapper og skjemafelt kan nås og brukes med tastatur', async ({ page }) => {
  await open(page)

  // Create
  await tabTo(page, '+ Legg til nytt gjøremål')
  await page.keyboard.press('Enter')
  const form = page.getByRole('dialog', { name: 'Nytt gjøremål' })
  await expect(form.getByLabel('Tittel')).toBeFocused()
  await page.keyboard.type('Dekkskift')
  await page.keyboard.press('Tab')
  await page.keyboard.type('Bytt til vinterdekk.')
  await tabTo(page, 'Dato 1')
  await page.keyboard.type('15.10')
  await tabTo(page, '+ Legg til ekstra dato')
  await page.keyboard.press('Enter')
  await expect(form.getByLabel('Dato 2', { exact: true })).toBeFocused()
  await page.keyboard.type('15.04')
  await tabTo(page, 'Fjern dato 2')
  await page.keyboard.press('Enter')
  await expect(form.getByLabel(/^Dato \d+$/)).toHaveCount(1)
  await tabTo(page, 'Lagre')
  await page.keyboard.press('Enter')
  await expect(form).toHaveCount(0)
  const saved = JSON.parse((await stored(page)) ?? '[]') as { title: string; dates: unknown }[]
  expect(saved).toMatchObject([{ title: 'Dekkskift', description: 'Bytt til vinterdekk.', dates: [{ month: 10, day: 15 }] }])

  // View
  await tabTo(page, 'Dekkskift')
  await page.keyboard.press('Enter')
  const view = page.getByRole('dialog', { name: 'Dekkskift' })
  await expect(view.getByText('↻ Gjentas automatisk hvert år')).toBeVisible()

  // Delete
  await tabTo(page, 'Slett')
  await page.keyboard.press('Enter')
  const confirm = page.getByRole('dialog', { name: 'Er du sikker?' })
  await expect(confirm.getByRole('button', { name: 'Avbryt' })).toBeFocused()
  await tabTo(page, 'Ja, slett')
  await page.keyboard.press('Enter')
  await expect(confirm).toHaveCount(0)
  expect(await stored(page)).toBe('[]')
  await expect(column(page).getByText('Ingen oppgaver denne måneden')).toBeVisible()
})

test('alle dialoger lukkes med Esc', async ({ page }) => {
  await open(page, TODOS)
  const before = await stored(page)

  // Form for a new todo, with something typed in
  await addButton(page).click()
  await page.getByRole('dialog', { name: 'Nytt gjøremål' }).getByLabel('Tittel').fill('Noe nytt')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)

  // View
  await column(page).getByRole('button', { name: 'Dekkskift', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Dekkskift' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)

  // Form for editing
  await column(page).getByRole('button', { name: 'Rediger «Dekkskift»' }).click()
  await page.getByRole('dialog', { name: 'Rediger gjøremål' }).getByLabel('Tittel').fill('Endret')
  await expect(page.getByRole('dialog', { name: 'Rediger gjøremål' }).getByLabel('Tittel')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)

  // Confirmation
  await column(page).getByRole('button', { name: 'Slett «Dekkskift»' }).click()
  await expect(page.getByRole('dialog', { name: 'Er du sikker?' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)

  expect(await stored(page)).toBe(before)
  await expect(column(page).getByRole('heading', { name: 'Dekkskift', exact: true })).toBeVisible()
})

test('når en dialog lukkes, går fokus tilbake til elementet som åpnet den', async ({ page }) => {
  await open(page, TODOS)

  // Each dialog must be open before Esc is pressed, or Esc reaches nothing
  await addButton(page).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog', { name: 'Nytt gjøremål' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(addButton(page)).toBeFocused()

  const title = column(page).getByRole('button', { name: 'Dekkskift', exact: true })
  await title.focus()
  await page.keyboard.press('Enter')
  await page.getByRole('dialog', { name: 'Dekkskift' }).getByRole('button', { name: 'Lukk' }).click()
  await expect(title).toBeFocused()

  // From the view on to the form: back to the dot that opened the first dialog
  const dot = page.getByRole('button', { name: 'Dekkskift, 15. oktober', exact: true })
  await dot.focus()
  await page.keyboard.press('Enter')
  await page.getByRole('dialog', { name: 'Dekkskift' }).getByRole('button', { name: 'Rediger' }).click()
  await expect(page.getByRole('dialog', { name: 'Rediger gjøremål' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dot).toBeFocused()

  const remove = column(page).getByRole('button', { name: 'Slett «Dekkskift»' })
  await remove.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog', { name: 'Er du sikker?' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(remove).toBeFocused()

  // The card that opened the dialog is gone after deleting, so focus goes to the add button
  await page.keyboard.press('Enter')
  await page.getByRole('dialog', { name: 'Er du sikker?' }).getByRole('button', { name: 'Ja, slett' }).click()
  await expect(addButton(page)).toBeFocused()
})
