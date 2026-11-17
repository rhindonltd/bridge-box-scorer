import { test, expect } from "@playwright/test";

import { deleteGame } from "../fixtures/delete-game";
import { confirmEntireGame } from "../fixtures/complete-game";
import { finaliseGame } from "../fixtures/game-setup";
import { fillAndSaveFullDeal } from "../fixtures/deal-entry";
import { fetchAdminToken } from "../fixtures/settings";
import {
  closeSeatDevices,
  setUpStartedTwoTableGame,
  gotoStable,
} from "./support";

/**
 * PBN export journey.
 *
 * Once the director has finalised the game (every result in), anyone can
 * download a PBN (Portable Bridge Notation) file of its dealt cards. The PBN is
 * deal-oriented (one block per board with an entered deal), and it needs the
 * club name (used as the PBN `Site`) configured in Settings. It only emits
 * boards that actually have a recorded deal.
 *
 * So the happy path records one deal (via the director Deals screen) so
 * the file has a board block to serialise, then downloads and inspects it.
 * Games record no opening lead so any play stays short.
 */

interface Schedule {
  rounds: { roundNumber: number; boards: number[] }[];
}

test.describe("PBN export", () => {
  test("a game with an entered deal downloads a populated PBN file", async ({
    browser,
    request,
  }) => {
    test.setTimeout(120_000);

    const { directorPage, gameId, seats } = await setUpStartedTwoTableGame(
      browser,
      `PBN ${Date.now()}`,
      { recordOpeningLead: false },
    );
    try {
      // Configure club info (admin-gated) — the club name is the PBN `Site`, so
      // the export requires it and the download button stays disabled without
      // it.
      const adminToken = await fetchAdminToken(request);
      const clubRes = await request.post("/api/system/club", {
        headers: { "x-admin-token": adminToken },
        data: { name: "E2E Bridge Club", clubNumber: "12345" },
      });
      expect(clubRes.ok()).toBe(true);

      // Record a deal for round 1's first board so the PBN has a board block to
      // emit (a game with no entered deals produces an empty file). Confirm every
      // board (finalising needs every result in), then enter the first board's
      // deal on the director Enter Deals screen.
      const res = await request.get(`/api/games/${gameId}/play-state/A1NS`);
      expect(res.ok()).toBeTruthy();
      const schedule: Schedule = (await res.json()).result;
      const board = schedule.rounds.find((r) => r.roundNumber === 1)!.boards[0];
      await confirmEntireGame(request, gameId);

      // The deals page's StartedGuard can briefly redirect to /manage while it
      // resolves, so gotoStable rides that out.
      await gotoStable(directorPage, `/game/${gameId}/manage/deals`);
      const boardButton = directorPage.getByTestId(`select-board-${board}`);
      await expect(boardButton).toBeVisible({ timeout: 15000 });
      await boardButton.click();

      await expect(directorPage.getByTestId("deal-entry")).toBeVisible({
        timeout: 15000,
      });
      await fillAndSaveFullDeal(directorPage);
      // Saving returns the director to the Manage Game Menu.
      await expect(directorPage).toHaveURL(
        new RegExp(`/game/${gameId}/manage$`),
        { timeout: 15000 },
      );

      // Finalise the game, which opens the PBN download to everyone, then open
      // the Download PBN screen; the configured club name is shown read-only.
      await finaliseGame(directorPage, gameId);
      await gotoStable(directorPage, `/game/${gameId}/export/download-pbn`);
      await expect(directorPage.getByTestId("pbn-club-name")).toHaveText(
        "E2E Bridge Club",
        { timeout: 15000 },
      );

      // Clicking triggers a blob download of the .pbn file.
      const downloadPromise = directorPage.waitForEvent("download", {
        timeout: 15000,
      });
      await directorPage.getByRole("button", { name: "Download PBN" }).click();
      const download = await downloadPromise;

      // The file has a .pbn name and non-empty PBN content: it carries the
      // event metadata and a board block with the deal we entered.
      expect(download.suggestedFilename()).toMatch(/\.pbn$/);
      const stream = await download.createReadStream();
      const chunks: Buffer[] = [];
      for await (const chunk of stream) chunks.push(chunk as Buffer);
      const content = Buffer.concat(chunks).toString("utf8");
      expect(content.length).toBeGreaterThan(0);
      expect(content).toContain('[Event "PBN');
      expect(content).toContain(`[Board "${board}"]`);
      expect(content).toContain("[Deal ");
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
      await closeSeatDevices(seats);
    }
  });

  test("the download is blocked until club info is configured", async ({
    browser,
    request,
  }) => {
    test.setTimeout(120_000);

    const { directorPage, gameId, seats } = await setUpStartedTwoTableGame(
      browser,
      `PBN No Club ${Date.now()}`,
      { recordOpeningLead: false },
    );

    try {
      // Clear the club record (admin-gated) so it is not configured.
      const adminToken = await fetchAdminToken(request);
      const clubRes = await request.post("/api/system/club", {
        headers: { "x-admin-token": adminToken },
        data: { name: "", clubNumber: "" },
      });
      expect(clubRes.ok()).toBe(true);
      await confirmEntireGame(request, gameId);
      await finaliseGame(directorPage, gameId);
      await gotoStable(directorPage, `/game/${gameId}/export/download-pbn`);

      // With club not configured, the screen points to Settings and the
      // Download button is disabled (club is not editable here).
      await expect(
        directorPage.getByText(/must be set in Settings/i),
      ).toBeVisible({ timeout: 15000 });
      await expect(
        directorPage.getByRole("button", { name: "Download PBN" }),
      ).toBeDisabled();
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
      await closeSeatDevices(seats);
    }
  });
});
