import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// The server runs with E2E_FIXTURES=1: these hashes resolve to recordings in test/fixtures.
const USDT = "/tx/ethereum/0x28d29eb5b12c2c57dcc445e2b9a38615e76d7232a7e96d485198071d8b199b3c";
const REVERTED = "/tx/ethereum/0x941d73b6dfc986a6d11d72c9aada4daeaca15c500357c47924757c298378bad9";
const UNKNOWN = `/tx/base/0x${"ab".repeat(32)}`;

test("explains a token transfer from facts alone", async ({ page }) => {
  await page.goto(USDT);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sent 54 USDT to 0x78fA…DB8b");
  const flows = page.getByRole("region", { name: "Balance changes" });
  await expect(flows).toContainText("−54 USDT");
  await expect(flows).toContainText("+54 USDT");
  await expect(page.getByRole("region", { name: "Function called" })).toContainText("transfer(address,uint256)");
  await expect(page).toHaveTitle(/Sent 54 USDT .* on Ethereum/);
});

test("says why nothing moved in a reverted transaction", async ({ page }) => {
  await page.goto(REVERTED);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^Failed call to/);
  await expect(page.getByText("Reverted", { exact: true })).toBeVisible();
  await expect(page.getByText(/only the fee was paid/)).toBeVisible();
});

test("reports a hash no network knows", async ({ page }) => {
  await page.goto(UNKNOWN);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Not found on Base");
});

test("rejects a link that is not a transaction", async ({ page }) => {
  const response = await page.goto("/tx/solana/0x1234");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("This link does not point to a transaction");
});

test("validates the hash before navigating", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Transaction hash").fill("0x1234");
  await page.getByRole("button", { name: "Explain transaction" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "hex characters" })).toBeVisible();
  await expect(page).toHaveURL("/");
});

test("opens a transaction from the form", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Transaction hash").fill(USDT.split("/").at(-1)!);
  await page.getByRole("button", { name: "Explain transaction" }).click();
  await expect(page).toHaveURL(USDT);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^Sent 54 USDT/);
});

test("transaction page has no serious accessibility violations", async ({ page }) => {
  await page.goto(USDT);
  await page.getByRole("heading", { name: "Events emitted (1)" }).click();
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
});
