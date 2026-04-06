import { test, expect } from '@playwright/test'

test.describe('Tutorial', () => {
  test('new game shows prologue overlay first', async ({ page }) => {
    await page.goto('/')
    await page.locator('button', { hasText: 'NEW GAME' }).click()
    await page.locator('button', { hasText: 'SLOT 1' }).click()
    await expect(page.getByTestId('prologue-overlay')).toBeVisible()
  })

  test('skipping prologue shows tutorial overlay', async ({ page }) => {
    await page.goto('/')
    await page.locator('button', { hasText: 'NEW GAME' }).click()
    await page.locator('button', { hasText: 'SLOT 1' }).click()
    await expect(page.getByTestId('prologue-overlay')).toBeVisible()

    // Skip prologue
    await page.getByTestId('prologue-skip').click()
    await page.getByTestId('prologue-skip-yes').click()

    // Now the tutorial overlay should appear
    await expect(page.getByTestId('tutorial-overlay')).toBeVisible()
  })

  test('skip button shows confirmation before dismissing tutorial', async ({ page }) => {
    await page.goto('/')
    await page.locator('button', { hasText: 'NEW GAME' }).click()
    await page.locator('button', { hasText: 'SLOT 1' }).click()

    // Skip prologue first
    await expect(page.getByTestId('prologue-overlay')).toBeVisible()
    await page.getByTestId('prologue-skip').click()
    await page.getByTestId('prologue-skip-yes').click()
    await expect(page.getByTestId('tutorial-overlay')).toBeVisible()

    // First click shows confirmation
    await page.getByTestId('tutorial-skip').click()
    await expect(page.getByTestId('tutorial-skip-confirm')).toBeVisible()

    // Clicking NO cancels and returns to SKIP button
    await page.getByTestId('tutorial-skip-no').click()
    await expect(page.getByTestId('tutorial-skip-confirm')).not.toBeVisible()
    await expect(page.getByTestId('tutorial-skip')).toBeVisible()

    // Click SKIP again, then YES to actually skip
    await page.getByTestId('tutorial-skip').click()
    await page.getByTestId('tutorial-skip-yes').click()
    await expect(page.getByTestId('tutorial-overlay')).not.toBeVisible()
  })

  test('prologue skip shows confirmation before skipping', async ({ page }) => {
    await page.goto('/')
    await page.locator('button', { hasText: 'NEW GAME' }).click()
    await page.locator('button', { hasText: 'SLOT 1' }).click()
    await expect(page.getByTestId('prologue-overlay')).toBeVisible()

    // First click shows confirmation
    await page.getByTestId('prologue-skip').click()
    await expect(page.getByTestId('prologue-skip-confirm')).toBeVisible()

    // Clicking NO cancels
    await page.getByTestId('prologue-skip-no').click()
    await expect(page.getByTestId('prologue-skip-confirm')).not.toBeVisible()
    await expect(page.getByTestId('prologue-skip')).toBeVisible()
  })

  test('tutorial does not appear on load game', async ({ page }) => {
    // Create a fake save so load game is enabled (correct key and format)
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem(
        'fracking-asteroids-slot-summaries',
        JSON.stringify([{ slotId: 'save-1', timestamp: Date.now() }]),
      )
    })
    await page.goto('/')
    const loadBtn = page.locator('button', { hasText: 'LOAD GAME' })
    await expect(loadBtn).toBeEnabled()
    await loadBtn.click()
    await page.locator('button', { hasText: 'SLOT 1' }).click()
    await expect(page.getByTestId('tutorial-overlay')).not.toBeVisible()
    await expect(page.getByTestId('prologue-overlay')).not.toBeVisible()
  })
})
