import { test, expect } from "./fixtures/director-fixture";

/**
 * Movement Page E2E Tests
 *
 * Tests the movement detail page: empty state when no movement is configured,
 * the movement API endpoint, and rendering of table data via route intercept.
 */

test.describe("Movement", () => {
  test("movement page shows empty state", async ({ directorContext }) => {
    const { page, gameId } = directorContext;
    await page.goto(`/manage/${gameId}/movement`);

    await expect(
      page.getByText("No movement set up yet."),
    ).toBeVisible({ timeout: 10000 });
  });

  test("movement API returns JSON for existing game", async ({
    directorContext,
    request,
  }) => {
    const { gameId } = directorContext;
    const response = await request.get(`/api/games/${gameId}/movement`);

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/json");

    const body = await response.json();
    expect(body).toHaveProperty("tables");
  });

  test("movement page renders table data with route intercept", async ({
    directorContext,
  }) => {
    const { page, gameId } = directorContext;

    // Intercept the movement API with mock data containing one table
    await page.route(`**/api/games/${gameId}/movement`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          type: "PAIRS",
          tables: [
            {
              tableNumber: 1,
              rounds: [
                {
                  roundNumber: 1,
                  ns: "1NS",
                  ew: "2EW",
                  boardStart: 1,
                  boardEnd: 3,
                },
              ],
            },
          ],
        }),
      }),
    );

    await page.goto(`/manage/${gameId}/movement`);

    // Assert table data is visible — the component renders "Table 1" header
    await expect(page.getByText("Table 1")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("1NS")).toBeVisible();
    await expect(page.getByText("2EW")).toBeVisible();
  });
});
