import { test, expect } from "./fixtures/director-fixture";

/**
 * Download USEBIO E2E Tests
 *
 * Tests the download-usebio page which allows the director to confirm
 * club details and download a USEBIO XML file for the game.
 */

test.describe("Download USEBIO", () => {
  test("download-usebio page renders", async ({ directorContext }) => {
    const { page, gameId } = directorContext;

    // Intercept the club API so the page loads without needing real data
    await page.route("**/api/system/club", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ club: { name: "Test Club", clubNumber: "99999" } }),
      }),
    );

    await page.goto(`/manage/${gameId}/download-usebio`);

    // Verify the header and form fields render
    await expect(page.getByRole("heading", { name: "Download USEBIO" }).or(page.locator("div").filter({ hasText: /^Download USEBIO$/ }))).toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel("Club Name")).toBeVisible();
    await expect(page.getByLabel("EBU Club Number")).toBeVisible();
    await expect(page.getByRole("button", { name: "Download USEBIO" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
  });

  test("Download USEBIO button triggers API call", async ({ directorContext }) => {
    const { page, gameId } = directorContext;

    // Stub the club API to pre-fill form fields
    await page.route("**/api/system/club", (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ club: { name: "Anytown BC", clubNumber: "12345" } }),
        });
      }
      // POST to save club info
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    // Intercept the USEBIO download endpoint
    let usebioRequested = false;
    await page.route(`**/api/games/${gameId}/usebio`, (route) => {
      usebioRequested = true;
      return route.fulfill({
        status: 200,
        contentType: "application/xml",
        headers: { "Content-Disposition": 'attachment; filename="results.xml"' },
        body: "<usebio></usebio>",
      });
    });

    await page.goto(`/manage/${gameId}/download-usebio`);

    // Wait for form to be populated from the club API
    await expect(page.getByLabel("Club Name")).toHaveValue("Anytown BC", { timeout: 10000 });

    // Click the download button
    await page.getByRole("button", { name: "Download USEBIO" }).click();

    // Verify the USEBIO API was called
    await expect.poll(() => usebioRequested, { timeout: 10000 }).toBe(true);
  });

  test("error display when USEBIO generation fails", async ({ directorContext }) => {
    const { page, gameId } = directorContext;

    // Stub club API
    await page.route("**/api/system/club", (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ club: { name: "Anytown BC", clubNumber: "12345" } }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    // Intercept USEBIO endpoint with an error response
    await page.route(`**/api/games/${gameId}/usebio`, (route) =>
      route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ success: false, error: "Club info not configured" }),
      }),
    );

    await page.goto(`/manage/${gameId}/download-usebio`);
    await expect(page.getByLabel("Club Name")).toHaveValue("Anytown BC", { timeout: 10000 });

    // Click the download button
    await page.getByRole("button", { name: "Download USEBIO" }).click();

    // Assert error message is displayed
    await expect(page.getByText("Club info not configured")).toBeVisible({ timeout: 10000 });
  });

  test("Cancel navigates back to menu", async ({ directorContext }) => {
    const { page, gameId } = directorContext;

    // Stub club API so the page loads
    await page.route("**/api/system/club", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ club: { name: "Test Club", clubNumber: "99999" } }),
      }),
    );

    await page.goto(`/manage/${gameId}/download-usebio`);
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible({ timeout: 10000 });

    // Click Cancel
    await page.getByRole("button", { name: "Cancel" }).click();

    // Assert navigation back to menu
    await expect(page).toHaveURL(`/manage/${gameId}/menu`, { timeout: 10000 });
  });
});
