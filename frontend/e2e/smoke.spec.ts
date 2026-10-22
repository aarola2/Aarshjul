import { expect, test } from '@playwright/test'

test('forsiden laster og viser overskriften', async ({ page }) => {
  // Relative path keeps the /Aarshjul/ base from baseURL
  await page.goto('./')
  await expect(page.getByRole('heading', { level: 1, name: 'Årshjul' })).toBeVisible()
})
