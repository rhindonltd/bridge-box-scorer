import { test, expect, type Page } from "@playwright/test";

import { openDirectorTraveller } from "../fixtures/director-override";
import { hubChoices, openHub } from "../fixtures/director-rulings";
import {
  closeDevices,
  openDirector,
  seedGame,
} from "../fixtures/seeded-game";

/**
 * A board played the wrong way round (the arrows were not switched). The
 * director marks that one table's board from the adjustment hub; the result is
 * kept, but the traveller shows the NS and EW pairs exchanged. Clearing the
 * flag restores the original. (Scoring, leaderboard and USEBIO credit are
 * covered by the service integration tests; this checks the real screens.)
 */

const ROW = "traveller-row-1-1";

/** The NS pair, EW pair and result cells of a traveller row. */
async function rowCells(
  page: Page,
): Promise<{ ns: string; ew: string; result: string }> {
  const cells = page.getByTestId(ROW).locator("td");
  await expect(cells).toHaveCount(3);
  const [ns, ew, result] = (await cells.allInnerTexts()).map((t) => t.trim());
  return { ns, ew, result };
}

/** Tap a hub button and wait for the redirect a saved ruling ends with. */
async function chooseHubAction(page: Page, label: string): Promise<void> {
  await page.getByRole("button", { name: label, exact: true }).click();
  await page.waitForURL(/\/game\/[^/]+\/manage$/, { timeout: 15000 });
}

test.describe("Played the wrong way round", () => {
  test("the director marks a board reversed, the traveller swaps the pairs, and clearing restores them", async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    const game = await seedGame({
      scoring: "MP",
      tables: 2,
      movement: "recommended",
      play: "all",
      eventName: `Reversed ${Date.now()}`,
    });
    const director = await openDirector(browser, game);
    try {
      await openDirectorTraveller(director, game.gameId, 1);
      const original = await rowCells(director);
      expect(original.ns).not.toBe(original.ew);

      // The hub offers to mark the board, not to clear it.
      await openHub(director, game.gameId, 1, ROW);
      const choices = await hubChoices(director);
      expect(choices).toContain("Mark Played Reversed");
      expect(choices).not.toContain("Clear Reversed");
      await chooseHubAction(director, "Mark Played Reversed");

      // The pairs are exchanged; the result is unchanged. The other table's
      // row for this board is untouched.
      await openDirectorTraveller(director, game.gameId, 1);
      const reversed = await rowCells(director);
      expect(reversed.ns).toBe(original.ew);
      expect(reversed.ew).toBe(original.ns);
      expect(reversed.result).toBe(original.result);

      // The hub now offers to clear it instead.
      await openHub(director, game.gameId, 1, ROW);
      const reversedChoices = await hubChoices(director);
      expect(reversedChoices).toContain("Clear Reversed");
      expect(reversedChoices).not.toContain("Mark Played Reversed");
      await chooseHubAction(director, "Clear Reversed");

      // Clearing restores the original attribution.
      await openDirectorTraveller(director, game.gameId, 1);
      expect(await rowCells(director)).toEqual(original);
    } finally {
      await closeDevices(director);
    }
  });
});
