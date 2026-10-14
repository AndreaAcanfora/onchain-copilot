import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("landing renders the pitch", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Onchain Copilot" })).toBeVisible();
});

test("landing has no serious accessibility violations", async ({ page }) => {
  await page.goto("/");
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
});
