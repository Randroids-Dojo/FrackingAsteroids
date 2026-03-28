import { test, expect } from '@playwright/test'

test.describe('Start Screen', () => {
  test('shows title and menu buttons', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=FRACKING')).toBeVisible()
    await expect(page.locator('text=ASTEROIDS')).toBeVisible()
    await expect(page.locator('text=NEW GAME')).toBeVisible()
    await expect(page.locator('text=LOAD GAME')).toBeVisible()
  })

  test('load game button is disabled when no saves exist', async ({ page }) => {
    await page.goto('/')
    const loadBtn = page.locator('button', { hasText: 'LOAD GAME' })
    await expect(loadBtn).toBeDisabled()
  })

  test('new game shows slot picker', async ({ page }) => {
    await page.goto('/')
    await page.locator('button', { hasText: 'NEW GAME' }).click()
    await expect(page.locator('text=SLOT 1')).toBeVisible()
    await expect(page.locator('text=SLOT 2')).toBeVisible()
    await expect(page.locator('text=SLOT 3')).toBeVisible()
  })

  test('selecting empty slot starts game with HUD', async ({ page }) => {
    await page.goto('/')
    await page.locator('button', { hasText: 'NEW GAME' }).click()
    await page.locator('button', { hasText: 'SLOT 1' }).click()
    await expect(page.locator('text=SCRAP')).toBeVisible()
    await expect(page.locator('text=CARGO')).toBeVisible()
    await expect(page.locator('text=BLASTER Mk1')).toBeVisible()
  })

  test('back button returns to main menu from slot picker', async ({ page }) => {
    await page.goto('/')
    await page.locator('button', { hasText: 'NEW GAME' }).click()
    await expect(page.locator('text=SLOT 1')).toBeVisible()
    await page.locator('button', { hasText: 'BACK' }).click()
    await expect(page.locator('text=NEW GAME')).toBeVisible()
  })
})

test.describe('Game HUD', () => {
  test('pause button toggles feedback fab', async ({ page }) => {
    await page.goto('/')
    await page.locator('button', { hasText: 'NEW GAME' }).click()
    await page.locator('button', { hasText: 'SLOT 1' }).click()
    const pauseBtn = page.getByLabel('Pause game')
    await pauseBtn.click()
    await expect(page.getByLabel('Send feedback')).toBeVisible()
  })
})
