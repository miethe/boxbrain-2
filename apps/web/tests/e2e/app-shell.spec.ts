import { expect, test } from "@playwright/test";

test("loads the app shell and navigates primary MVP routes", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("nav-ask")).toBeVisible();

  await page.getByTestId("nav-library").click();
  await expect(page.getByTestId("library-page")).toBeVisible();

  await page.getByTestId("nav-reviews").click();
  await expect(page.getByTestId("reviews-page")).toBeVisible();
});
