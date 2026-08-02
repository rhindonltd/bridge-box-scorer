import { test, expect } from "@playwright/test";
import { attachScreenshot } from "./helpers";

test("Settings PIN gate, WiFi config, and club info", async ({
  page,
}, testInfo) => {
  // Step 1: Navigate to /settings — see the PIN entry page
  await test.step("Navigate to settings and see PIN entry", async () => {
    await page.goto("/settings");
    await expect(
      page.getByRole("heading", { name: "Enter PIN to continue" }),
    ).toBeVisible();
    await expect(page.getByLabel("PIN")).toBeVisible();
    await attachScreenshot(page, testInfo, "Settings - PIN entry page");
  });

  // Step 2: Enter PIN "1234" and click "Enter" — verify settings page loads
  await test.step("Enter PIN and access settings", async () => {
    await page.getByLabel("PIN").fill("1234");
    await page.getByRole("button", { name: "Enter" }).click();
    await expect(
      page.getByRole("button", { name: "WiFi Settings" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Club Information" }),
    ).toBeVisible();
    await attachScreenshot(page, testInfo, "Settings - Main settings page");
  });

  // Step 3: Click "WiFi Settings" — verify WiFi page renders with network selector
  await test.step("Navigate to WiFi settings", async () => {
    await page.getByRole("button", { name: "WiFi Settings" }).click();
    await expect(
      page.getByRole("heading", { name: "WiFi Settings" }),
    ).toBeVisible();
    // Verify network selector is present (the dropdown button with placeholder text)
    await expect(
      page.getByRole("button", { name: /Select WiFi/i }),
    ).toBeVisible();
    await attachScreenshot(page, testInfo, "Settings - WiFi settings page");
  });

  // Step 4: Navigate back to settings
  await test.step("Navigate back to settings", async () => {
    await page.goto("/settings");
    // PIN state is lost on navigation (client state), so re-enter PIN
    await page.getByLabel("PIN").fill("1234");
    await page.getByRole("button", { name: "Enter" }).click();
    await expect(
      page.getByRole("button", { name: "Club Information" }),
    ).toBeVisible();
  });

  // Step 5: Click "Club Information" — verify club info page loads
  await test.step("Navigate to Club Information", async () => {
    await page.getByRole("button", { name: "Club Information" }).click();
    // The club page header is a styled div, not a semantic heading
    await expect(
      page.getByText("Club Information", { exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Club Name")).toBeVisible();
    await expect(page.getByLabel("EBU Club Number")).toBeVisible();
    await attachScreenshot(page, testInfo, "Settings - Club Information page");
  });

  // Step 6: Fill in Club Name and EBU Club Number
  const clubName = `E2E Test Club ${Date.now()}`;
  const ebuNumber = "99999";

  await test.step("Fill in club details", async () => {
    await page.getByLabel("Club Name").fill(clubName);
    await page.getByLabel("EBU Club Number").fill(ebuNumber);
    await attachScreenshot(page, testInfo, "Settings - Club details filled");
  });

  // Step 7: Click "Save" — verify success message
  await test.step("Save club information", async () => {
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText(/Club info saved/)).toBeVisible();
    await attachScreenshot(
      page,
      testInfo,
      "Settings - Club info saved success",
    );
  });

  // Step 8: Reload the page — verify the values persist
  await test.step("Reload and verify persistence", async () => {
    await page.reload();
    // After reload at /settings/club, PIN entry appears again
    await page.getByLabel("PIN").fill("1234");
    await page.getByRole("button", { name: "Enter" }).click();
    // We're still on the club page after PIN re-entry (URL is /settings/club)
    await expect(
      page.getByText("Club Information", { exact: true }),
    ).toBeVisible();
    // Verify the saved values persist
    await expect(page.getByLabel("Club Name")).toHaveValue(clubName);
    await expect(page.getByLabel("EBU Club Number")).toHaveValue(ebuNumber);
    await attachScreenshot(
      page,
      testInfo,
      "Settings - Club info persisted after reload",
    );
  });
});
