import { test, expect } from "@playwright/test";
import {
  createGameStep,
  attachScreenshot,
  cleanupGames,
  deleteGameStep,
} from "./helpers";

const BASE_URL = "http://localhost:3000";

test.beforeAll(async () => {
  await cleanupGames(BASE_URL);
});

test.afterAll(async () => {
  await cleanupGames(BASE_URL);
});

test("USEBIO XML download with club data", async ({ browser }, testInfo) => {
  const deviceConfig = test.info().project.use;

  const directorContext = await browser.newContext(deviceConfig);
  const directorPage = await directorContext.newPage();

  let gameId = "";

  try {
    // Step 1: Set up club info via API
    await test.step("Set up club information via API", async () => {
      const response = await fetch(`${BASE_URL}/api/system/club`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Journey Test Club",
          clubNumber: "12345",
        }),
      });
      expect(response.ok).toBe(true);
    });

    // Step 2: Director creates a game
    ({ gameId } = await createGameStep(directorPage, testInfo, {
      eventName: `E2E Journey - USEBIO Download - ${Date.now()}`,
      directorName: "E2E Director",
      tables: 2,
    }));

    // Step 3: Director navigates to the USEBIO download page
    await test.step("Director navigates to USEBIO download page", async () => {
      await directorPage.goto(`/manage/${gameId}/download-usebio`);
      await directorPage.waitForLoadState("networkidle");
      await attachScreenshot(
        directorPage,
        testInfo,
        "Director - USEBIO download page loaded",
      );
    });

    // Step 4: Verify Club Name and EBU Club Number are pre-populated
    await test.step("Club Name and EBU Club Number fields are pre-populated", async () => {
      await expect(directorPage.getByLabel("Club Name")).toHaveValue(
        "Journey Test Club",
        { timeout: 10000 },
      );
      await expect(directorPage.getByLabel("EBU Club Number")).toHaveValue(
        "12345",
        { timeout: 10000 },
      );
      await attachScreenshot(
        directorPage,
        testInfo,
        "Director - Club fields pre-populated",
      );
    });

    // Step 5: Click "Download USEBIO" and intercept the download response
    await test.step("Download USEBIO button triggers XML download", async () => {
      // Intercept the USEBIO download endpoint to verify the response
      let usebioResponseContentType: string | null = null;
      let usebioResponseBody: string | null = null;

      await directorPage.route(
        `**/api/games/${gameId}/usebio`,
        async (route) => {
          // Let the request continue to the real server
          const response = await route.fetch();
          usebioResponseContentType =
            response.headers()["content-type"] ?? null;
          usebioResponseBody = await response.text();

          // Fulfill with the real response so the page behaves normally
          await route.fulfill({ response });
        },
      );

      // Click the download button
      await directorPage
        .getByRole("button", { name: "Download USEBIO" })
        .click();

      // Wait for the intercept to capture the response
      await expect
        .poll(() => usebioResponseContentType, { timeout: 15000 })
        .toBeTruthy();

      // Verify content type is application/xml
      expect(usebioResponseContentType).toContain("application/xml");

      // Verify the XML includes the event name
      expect(usebioResponseBody).toContain("E2E Journey - USEBIO Download");

      await attachScreenshot(
        directorPage,
        testInfo,
        "Director - USEBIO download triggered",
      );
    });
  } finally {
    await deleteGameStep(directorPage, gameId);
    await directorContext.close();
  }
});
