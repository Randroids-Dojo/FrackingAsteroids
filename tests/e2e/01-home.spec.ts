import { test, expect } from "@playwright/test";

test.describe("Home Page", () => {
  test("loads and shows HUD elements", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=SCRAP")).toBeVisible();
    await expect(page.locator("text=CARGO")).toBeVisible();
    await expect(page.locator("text=BLASTER")).toBeVisible();
  });

  test("pause button toggles feedback fab", async ({ page }) => {
    await page.goto("/");
    const pauseBtn = page.getByLabel("Pause game");
    await pauseBtn.click();
    await expect(page.getByLabel("Send feedback")).toBeVisible();
  });
});
