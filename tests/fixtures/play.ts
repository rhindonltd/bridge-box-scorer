import { Page, expect } from "@playwright/test";

/**
 * Pure-UI result-entry helpers for the player screens at
 * `/game/{id}/play/{seat}`.
 *
 * The simplest confirmable result is a Pass Out: both the NS and EW pair enter
 * "Pass Out" for the same board, the results match, and the board is confirmed
 * (which is what triggers the live leaderboard/traveller pushes the journeys
 * assert on). This drives the real ContractWizard end to end — no socket seam.
 */

/**
 * Enter a Pass Out for a single seat on a specific board.
 *
 * Walks: open the seat, Enter Round, pick the board, Pass Out, Submit. Leaves
 * the page in whatever state the flow lands in — "Waiting for confirmation"
 * (first side) or "Board Results" (second side, once the board confirms).
 */
export async function enterPassOut(
  page: Page,
  gameId: string,
  seat: string,
  boardNumber: number,
): Promise<void> {
  await page.goto(`/game/${gameId}/play/${seat}`);

  const enterRound = page.getByTestId("play-enter-round");
  await expect(enterRound).toBeVisible({ timeout: 15000 });
  await enterRound.click();

  const boardButton = page.getByTestId(`wizard-board-${boardNumber}`);
  await expect(boardButton).toBeVisible({ timeout: 15000 });
  await boardButton.click();

  const passOut = page.getByTestId("wizard-pass-out");
  await expect(passOut).toBeVisible();
  await passOut.click();

  const submit = page.getByTestId("wizard-submit");
  await expect(submit).toBeVisible();
  await submit.click();
}

/**
 * Confirm a board by entering matching Pass Outs from both sides of a table.
 *
 * The NS page is left showing "Waiting for confirmation" until EW submits;
 * once EW submits the matching result the board confirms and both pages land
 * on "Board Results". Waits for the NS page to reach board results so callers
 * know the confirmation (and its live pushes) has fired.
 */
export async function confirmBoardPassOut(
  nsPage: Page,
  ewPage: Page,
  gameId: string,
  table: number,
  boardNumber: number,
  section = "A",
): Promise<void> {
  const nsSeat = `${section}${table}NS`;
  const ewSeat = `${section}${table}EW`;

  await enterPassOut(nsPage, gameId, nsSeat, boardNumber);
  await expect(nsPage.getByText("Waiting for confirmation")).toBeVisible({
    timeout: 15000,
  });

  await enterPassOut(ewPage, gameId, ewSeat, boardNumber);

  // The BOARD_CONFIRMED socket event flips the still-waiting NS page straight
  // to Board Results; asserting on NS proves the live confirmation propagated.
  await expect(nsPage.getByText("Board Results")).toBeVisible({
    timeout: 15000,
  });
}
