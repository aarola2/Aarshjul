import { expect, test, type Page } from '@playwright/test'

const STORAGE_KEY = 'aarhjul:v1:todos'
const TITLE = 'Rense takrennene'

const form = (page: Page) => page.getByRole('dialog', { name: 'Nytt gjøremål' })
const confirm = (page: Page) => page.getByRole('dialog', { name: 'Er du sikker?' })
const column = (page: Page) => page.getByRole('complementary', { name: 'Denne måneden' })
const card = (page: Page) =>
  column(page).getByRole('article').filter({ has: page.getByRole('heading', { name: TITLE, exact: true }) })
const dot = (page: Page, name: string) => page.getByRole('button', { name, exact: true })
const dots = (page: Page) => page.getByRole('button', { name: new RegExp(`^${TITLE}, `) })
const stored = (page: Page) => page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)

async function screenshot(page: Page, name: string) {
  await test.info().attach(name, { body: await page.screenshot(), contentType: 'image/png' })
}

async function createWithTwoDates(page: Page) {
  await page.getByRole('button', { name: '+ Legg til nytt gjøremål' }).click()
  await form(page).getByLabel('Tittel').fill(TITLE)
  await form(page).getByLabel('Dato 1', { exact: true }).fill('03.10')
  await form(page).getByRole('button', { name: '+ Legg til ekstra dato' }).click()
  await form(page).getByLabel('Dato 2', { exact: true }).fill('20.10')
  await form(page).getByRole('button', { name: 'Lagre' }).click()
  await expect(form(page)).toHaveCount(0)
}

async function deleteAfterConfirming(page: Page) {
  await card(page).getByRole('button', { name: `Slett «${TITLE}»` }).click()
  await expect(confirm(page).getByText(`«${TITLE}» slettes. Dette kan ikke angres.`)).toBeVisible()
  await confirm(page).getByRole('button', { name: 'Ja, slett' }).click()
  await expect(confirm(page)).toHaveCount(0)
}

test('hovedflyten: opprett med to datoer, se to prikker, slett etter bekreftelse, og prikkene er borte', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date('2026-10-27T12:00:00'))
  await page.goto('./')
  await expect(dots(page)).toHaveCount(0)

  await createWithTwoDates(page)
  await expect(dots(page)).toHaveCount(2)
  await expect(dot(page, `${TITLE}, 3. oktober`)).toBeVisible()
  await expect(dot(page, `${TITLE}, 20. oktober`)).toBeVisible()
  await expect(card(page)).toBeVisible()
  await screenshot(page, 'to prikker på hjulet')

  await deleteAfterConfirming(page)
  await expect(dots(page)).toHaveCount(0)
  await expect(card(page)).toHaveCount(0)
  expect(JSON.parse((await stored(page)) ?? 'null')).toEqual([])
  await screenshot(page, 'etter sletting')

  await page.reload()
  await expect(dots(page)).toHaveCount(0)
  await expect(card(page)).toHaveCount(0)
})
