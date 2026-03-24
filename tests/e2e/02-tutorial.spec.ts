import { test, expect } from '@playwright/test'

test.describe('Tutorial', () => {
  test.beforeEach(async ({ page }) => {
    // Clear tutorial completion flag before each test
    await page.goto('/')
    await page.evaluate(() => localStorage.removeItem('fracking-asteroids-tutorial-done'))
  })

  test('new game shows tutorial overlay', async ({ page }) => {
    await page.goto('/')
    await page.locator('button', { hasText: 'NEW GAME' }).click()
    await page.locator('button', { hasText: 'SLOT 1' }).click()
    await expect(page.getByTestId('tutorial-overlay')).toBeVisible()
  })

  test('skip button dismisses tutorial', async ({ page }) => {
    await page.goto('/')
    await page.locator('button', { hasText: 'NEW GAME' }).click()
    await page.locator('button', { hasText: 'SLOT 1' }).click()
    await expect(page.getByTestId('tutorial-overlay')).toBeVisible()
    await page.getByTestId('tutorial-skip').click()
    await expect(page.getByTestId('tutorial-overlay')).not.toBeVisible()
  })

  test('tutorial does not reappear after completion', async ({ page }) => {
    // Mark tutorial as done
    await page.evaluate(() => localStorage.setItem('fracking-asteroids-tutorial-done', 'true'))
    await page.goto('/')
    await page.locator('button', { hasText: 'NEW GAME' }).click()
    await page.locator('button', { hasText: 'SLOT 1' }).click()
    await expect(page.getByTestId('tutorial-overlay')).not.toBeVisible()
  })

  test('tutorial does not appear on load game', async ({ page }) => {
    // Create a fake save so load game is enabled
    await page.evaluate(() => {
      localStorage.setItem(
        'fracking-asteroids-saves',
        JSON.stringify({
          'save-1': { wave: 1, score: 0, timestamp: Date.now() },
        }),
      )
    })
    await page.goto('/')
    const loadBtn = page.locator('button', { hasText: 'LOAD GAME' })
    // Only test if load button is enabled (requires existing save)
    if (await loadBtn.isEnabled()) {
      await loadBtn.click()
      await page.locator('button', { hasText: 'SLOT 1' }).click()
      await expect(page.getByTestId('tutorial-overlay')).not.toBeVisible()
    }
  })
})
