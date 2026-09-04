import { Page, expect } from "@playwright/test";

/**
 * Pure-UI director traveller override helper.
 *
 * Drives `/game/{id}/manage/travellers`: pick a board, open its traveller, tap
 * the row to correct, then walk the DirectorContractWizard to enter a simple
 * made contract (1NT by North, making exactly). Must run in a director-
 * authorised context (the game-creating page).
 *
 * A made contract is used (rather than Pass Out) so the override is a visible
 * change from a table-entered Pass Out. The wizard includes an opening-lead
 * step when the game requires lead cards, which this helper handles.
 */

/**
 * Open the director traveller for a board and return once its rows are shown.
 * Row test ids are `traveller-row-{round}-{table}`.
 */
export async function openDirectorTraveller(
  page: Page,
  gameId: string,
  boardNumber: number,
): Promise<void> {
  await page.goto(`/game/${gameId}/manage/travellers`);
  const boardButton = page.getByTestId(`select-board-${boardNumber}`);
  await expect(boardButton).toBeVisible({ timeout: 15000 });
  await boardButton.click();
  await expect(
    page.getByText("Tap a row to adjust the result"),
  ).toBeVisible({ timeout: 15000 });
}

/**
 * Override a single traveller row to "1NT by North, making" via the director
 * wizard. `rowTestId` is a `traveller-row-{round}-{table}` id.
 *
 * @param leadCardRequired whether the game requires an opening lead (adds a
 *   lead-entry step to the wizard).
 */
export async function overrideRowToOneNotrump(
  page: Page,
  rowTestId: string,
  leadCardRequired: boolean,
): Promise<void> {
  await page.getByTestId(rowTestId).click();

  // Step: Level — pick 1.
  await page.getByRole("button", { name: "1", exact: true }).click();
  // Step: Suit — pick 1NT.
  await page.getByRole("button", { name: "1NT" }).click();
  // Step: Declarer — pick North, undoubled (button label "1NTN").
  await page.getByRole("button", { name: "1NTN", exact: true }).click();

  if (leadCardRequired) {
    // Step: Opening lead — pick the ace of spades, then continue.
    await page.getByRole("button", { name: "\u2660", exact: true }).first().click();
    await page.getByRole("button", { name: "A", exact: true }).first().click();
    await page.getByRole("button", { name: "Next", exact: true }).click();
  }

  // Step: Result — made exactly.
  await page.getByRole("button", { name: "=", exact: true }).click();

  // Step: Confirm — submit the override. Saving redirects to the manage menu.
  await page.getByTestId("wizard-submit").click();
  await page.waitForURL(/\/game\/[^/]+\/manage$/, { timeout: 15000 });
}
