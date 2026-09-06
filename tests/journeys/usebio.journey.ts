import { test, expect } from "@playwright/test";

import { deleteGame } from "../fixtures/delete-game";
import { confirmEntireGame } from "../fixtures/complete-game";
import { setUpStartedTwoTableGame } from "./support";

/**
 * USEBIO export journey.
 *
 * The director can download a USEBIO XML of the results once every board is in.
 * The download screen confirms the club name + EBU number (both required) and
 * then streams the file. This journey completes a game, sets club info, and
 * downloads the file, plus checks the required-field validation and the API's
 * not-found path.
 */

test.describe("USEBIO export", () => {
  test("completing a game enables a USEBIO download with club details", async ({
    browser,
    request,
  }) => {
    test.setTimeout(120_000);

    const { directorPage, gameId } = await setUpStartedTwoTableGame(
      browser,
      `USEBIO ${Date.now()}`,
      { recordOpeningLead: false },
    );

    try {
      // Complete every board so "all results in" (the manage menu enables the
      // download only then; the export needs results to serialise).
      await confirmEntireGame(request, gameId);

      // Set club info up-front via the API so the download screen prefills and
      // validation passes. (The club record is device-wide.)
      const clubRes = await request.post("/api/system/club", {
        data: { name: "E2E Bridge Club", clubNumber: "12345" },
      });
      expect(clubRes.ok()).toBe(true);

      await directorPage.goto(`/game/${gameId}/manage/download-usebio`);

      // The prefilled club fields are shown.
      await expect(directorPage.getByLabel("Club Name")).toHaveValue(
        "E2E Bridge Club",
        { timeout: 15000 },
      );

      // Download: clicking triggers a blob download of the XML file.
      const downloadPromise = directorPage.waitForEvent("download", {
        timeout: 15000,
      });
      await directorPage
        .getByRole("button", { name: "Download USEBIO" })
        .click();
      const download = await downloadPromise;

      // The downloaded file has an .xml name and non-empty contents.
      expect(download.suggestedFilename()).toMatch(/\.xml$/);
      const stream = await download.createReadStream();
      const chunks: Buffer[] = [];
      for await (const chunk of stream) chunks.push(chunk as Buffer);
      const content = Buffer.concat(chunks).toString("utf8");
      expect(content.length).toBeGreaterThan(0);
      expect(content).toContain("<");
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
    }
  });

  test("required club fields are validated on the download screen", async ({
    browser,
    request,
  }) => {
    test.setTimeout(120_000);

    const { directorPage, gameId } = await setUpStartedTwoTableGame(
      browser,
      `USEBIO Validation ${Date.now()}`,
      { recordOpeningLead: false },
    );

    try {
      await confirmEntireGame(request, gameId);

      // Clear the club record so the fields start empty.
      await request.post("/api/system/club", {
        data: { name: "", clubNumber: "" },
      });

      await directorPage.goto(`/game/${gameId}/manage/download-usebio`);

      // With both fields empty, downloading is rejected with the required
      // message (no download is triggered).
      await expect(directorPage.getByLabel("Club Name")).toHaveValue("", {
        timeout: 15000,
      });
      await directorPage
        .getByRole("button", { name: "Download USEBIO" })
        .click();
      await expect(
        directorPage.getByText("Both club name and number are required"),
      ).toBeVisible({ timeout: 15000 });
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
    }
  });

  test("USEBIO for a nonexistent game returns 404", async ({ request }) => {
    const res = await request.get("/api/games/nonexistent/usebio");
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
  });
});
