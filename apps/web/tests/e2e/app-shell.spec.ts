import { expect, test } from "@playwright/test";

test("loads the app shell and navigates primary MVP routes", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "BoxBrain operating console" })).toBeVisible();
  const sidebar = page.getByRole("complementary");
  await expect(sidebar.getByRole("link", { name: "Ask BoxBrain" })).toBeVisible();

  await sidebar.getByRole("link", { name: "Library" }).click();
  await expect(page.getByRole("heading", { name: "Family-first governed catalog" })).toBeVisible();

  await sidebar.getByRole("link", { name: /Reviews/ }).click();
  await expect(page.getByRole("heading", { name: "Review AI suggestions before graph changes" })).toBeVisible();
});
