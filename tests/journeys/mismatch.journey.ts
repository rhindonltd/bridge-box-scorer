import { test, expect } from "@playwright/test";

import { deleteGame } from "../fixtures/delete-game";
import { ContractSpec, enterContractRaw } from "../fixtures/play";
import { newParticipant, setUpStartedTwoTableGame } from "./support";

/**
 * Dual-side mismatch journey (pure UI, no socket seam).
 *
 * When the two sides of a table submit results that don't match, the board is
 * NOT confirmed and both tablets show the mismatch screen. There are two
 * variants:
 *   A) different BOARD numbers  -> title "Mismatch", "different boards" copy.
 *   B) same board, different RESULT -> title "Board {n}", "different results".
 * After a mismatch, "Re-enter Result" returns each side to contract entry;
 * once both submit matching results the board confirms live.
 *
 * These games are created with opening-lead recording OFF to keep the wizard
 * short (no lead step); the mismatch logic is independent of the lead setting.
 */

// Two contracts that differ only in the result, for the result-mismatch case.
const FOUR_HEARTS_MADE: ContractSpec = {
  level: 4,
  suit: "H",
  declarer: "N",
  result: { mode: "made", value: 0 },
};
const FOUR_HEARTS_PLUS_ONE: ContractSpec = {
  level: 4,
  suit: "H",
  declarer: "N",
  result: { mode: "made", value: 1 },
};

test.describe("Dual-side mismatch and re-enter", () => {
  test("same board, different result -> result mismatch, then re-enter to confirm", async ({
    browser,
  }) => {
    test.setTimeout(90_000);

    const { directorPage, gameId } = await setUpStartedTwoTableGame(
      browser,
      `Result Mismatch ${Date.now()}`,
      { recordOpeningLead: false },
    );

    const nsPage = await newParticipant(browser);
    const ewPage = await newParticipant(browser);

    try {
      // NS enters 4♥= ; EW enters 4♥+1 on the SAME board 1.
      await enterContractRaw(nsPage, gameId, "A1NS", 1, FOUR_HEARTS_MADE, {
        leadCardRequired: false,
      });
      await expect(nsPage.getByText("Waiting for confirmation")).toBeVisible({
        timeout: 15000,
      });

      await enterContractRaw(ewPage, gameId, "A1EW", 1, FOUR_HEARTS_PLUS_ONE, {
        leadCardRequired: false,
      });

      // Both sides land on the result-mismatch screen (title "Board 1", with
      // the "different results" explanation and both sides' entries shown).
      await expect(
        nsPage.getByText("Results Don't Match"),
      ).toBeVisible({ timeout: 15000 });
      await expect(
        nsPage.getByText(/entered different results/i),
      ).toBeVisible();
      await expect(nsPage.getByText("NS entered:")).toBeVisible();
      await expect(nsPage.getByText("EW entered:")).toBeVisible();
      await expect(
        ewPage.getByText("Results Don't Match"),
      ).toBeVisible({ timeout: 15000 });

      // Re-enter on both sides with a matching result (4♥=). Both mismatch
      // screens offer "Re-enter Result", which reopens the wizard at board
      // select.
      await nsPage.getByRole("button", { name: "Re-enter Result" }).click();
      await ewPage.getByRole("button", { name: "Re-enter Result" }).click();

      // NS re-enters first. Because EW's original "+1" is still pending, the
      // server re-compares and NS is bounced straight back to the mismatch
      // screen — the pending submissions still differ. (Re-submitting a side
      // replaces that side's pending entry; it does not confirm on its own.)
      await reenterMatching(nsPage, FOUR_HEARTS_MADE);

      // EW then re-enters the matching "=" result. Now both pending submissions
      // agree, the board confirms, and both tablets land on Board Results.
      await reenterMatching(ewPage, FOUR_HEARTS_MADE);

      await expect(nsPage.getByText("Board Results")).toBeVisible({
        timeout: 15000,
      });
      await expect(ewPage.getByText("Board Results")).toBeVisible({
        timeout: 15000,
      });
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
      await nsPage.context().close();
      await ewPage.context().close();
    }
  });

  test("different boards -> board mismatch screen", async ({ browser }) => {
    test.setTimeout(90_000);

    const { directorPage, gameId } = await setUpStartedTwoTableGame(
      browser,
      `Board Mismatch ${Date.now()}`,
      { recordOpeningLead: false },
    );

    const nsPage = await newParticipant(browser);
    const ewPage = await newParticipant(browser);

    try {
      // NS enters board 1; EW enters board 2 (a different board in the round).
      await enterContractRaw(nsPage, gameId, "A1NS", 1, FOUR_HEARTS_MADE, {
        leadCardRequired: false,
      });
      await expect(nsPage.getByText("Waiting for confirmation")).toBeVisible({
        timeout: 15000,
      });

      await enterContractRaw(ewPage, gameId, "A1EW", 2, FOUR_HEARTS_MADE, {
        leadCardRequired: false,
      });

      // Both sides show the board-mismatch screen: title "Mismatch" and the
      // "different boards" explanation.
      await expect(nsPage.getByText("Results Don't Match")).toBeVisible({
        timeout: 15000,
      });
      await expect(
        nsPage.getByText(/results for different boards/i),
      ).toBeVisible();
      await expect(ewPage.getByText("Results Don't Match")).toBeVisible({
        timeout: 15000,
      });
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
      await nsPage.context().close();
      await ewPage.context().close();
    }
  });
});

/**
 * Re-enter a contract from the mismatch screen. After clicking "Re-enter
 * Result" the wizard reopens at the board-select step for the same board, so
 * this walks board -> level -> suit -> declarer -> result -> submit (no lead;
 * these games record no opening lead).
 */
async function reenterMatching(
  page: import("@playwright/test").Page,
  spec: ContractSpec,
): Promise<void> {
  const suitGlyph: Record<ContractSpec["suit"], string> = {
    S: "\u2660",
    H: "\u2665",
    D: "\u2666",
    C: "\u2663",
    NT: "NT",
  };

  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const clickText = async (label: string) => {
    const btn = page
      .locator("button")
      .filter({ hasText: new RegExp(`^${esc(label)}$`) });
    await expect(btn.first()).toBeVisible({ timeout: 15000 });
    await btn.first().click();
  };

  // Board select reopens; the board is the one being disputed. Pick the first
  // enabled board button (there is only one in-flight board here).
  const boardBtn = page.locator('[data-testid^="wizard-board-"]').first();
  await expect(boardBtn).toBeVisible({ timeout: 15000 });
  await boardBtn.click();

  await clickText(String(spec.level));
  const suitName =
    spec.suit === "NT"
      ? `${spec.level}NT`
      : `${spec.level}${suitGlyph[spec.suit]}`;
  await clickText(suitName);
  const declarerName =
    spec.suit === "NT"
      ? `${spec.level}NT${spec.declarer}${spec.doubling ?? ""}`
      : `${spec.level}${suitGlyph[spec.suit]}${spec.declarer}${spec.doubling ?? ""}`;
  await clickText(declarerName);

  if (spec.result.mode === "down") {
    await clickText("Down");
  }
  const resultName =
    spec.result.mode === "made"
      ? spec.result.value === 0
        ? "="
        : `+${spec.result.value}`
      : `-${spec.result.value}`;
  await clickText(resultName);

  await page.getByTestId("wizard-submit").click();
}
