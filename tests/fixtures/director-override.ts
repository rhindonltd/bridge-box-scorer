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
 * A director-override contract spec, mirroring the player-side `ContractSpec`
 * but self-contained here so the director fixtures don't depend on the play
 * fixtures. `suit` uses model codes (S/H/D/C/NT); `result` is made (value 0 =
 * "=", positive = overtricks) or down (positive = undertricks).
 */
export interface OverrideContractSpec {
  level: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  suit: "S" | "H" | "D" | "C" | "NT";
  declarer: "N" | "E" | "S" | "W";
  doubling?: "" | "X" | "XX";
  result: { mode: "made" | "down"; value: number };
}

const SUIT_GLYPH: Record<OverrideContractSpec["suit"], string> = {
  S: "\u2660",
  H: "\u2665",
  D: "\u2666",
  C: "\u2663",
  NT: "NT",
};

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Click a wizard button by EXACT trimmed text content. The glyph-bearing steps
 * (suit/declarer) don't match reliably via role+name in WebKit, so anchor on
 * text content — the same approach used by the player play fixtures.
 */
async function clickButtonByText(page: Page, label: string): Promise<void> {
  const button = page
    .locator("button")
    .filter({ hasText: new RegExp(`^${escapeRegExp(label)}$`) });
  await expect(button.first()).toBeVisible({ timeout: 15000 });
  await button.first().click();
}

function declarerLabel(spec: OverrideContractSpec): string {
  const dbl = spec.doubling ?? "";
  if (spec.suit === "NT") return `${spec.level}NT${spec.declarer}${dbl}`;
  return `${spec.level}${SUIT_GLYPH[spec.suit]}${spec.declarer}${dbl}`;
}

function resultLabel(result: OverrideContractSpec["result"]): string {
  if (result.mode === "made") return result.value === 0 ? "=" : `+${result.value}`;
  return `-${result.value}`;
}

/**
 * Override a traveller row to an arbitrary played contract via the director
 * wizard. `rowTestId` is a `traveller-row-{round}-{table}` id. Walks Level ->
 * Suit -> Declarer (+ doubling) -> (Lead) -> Made/Down -> Confirm, then waits
 * for the redirect back to the manage menu.
 */
export async function overrideRowToContract(
  page: Page,
  rowTestId: string,
  spec: OverrideContractSpec,
  { leadCardRequired = true }: { leadCardRequired?: boolean } = {},
): Promise<void> {
  await page.getByTestId(rowTestId).click();

  // Step: Level.
  await clickButtonByText(page, String(spec.level));
  // Step: Suit.
  await clickButtonByText(
    page,
    spec.suit === "NT" ? `${spec.level}NT` : `${spec.level}${SUIT_GLYPH[spec.suit]}`,
  );
  // Step: Declarer (apply doubling toggle first).
  const dbl = spec.doubling ?? "";
  if (dbl) await clickButtonByText(page, dbl);
  await clickButtonByText(page, declarerLabel(spec));

  if (leadCardRequired) {
    await clickButtonByText(page, SUIT_GLYPH.S);
    await clickButtonByText(page, "A");
    await clickButtonByText(page, "Next");
  }

  // Step: Result.
  if (spec.result.mode === "down") await clickButtonByText(page, "Down");
  await clickButtonByText(page, resultLabel(spec.result));

  // Step: Confirm — submit. Saving redirects to the manage menu.
  await page.getByTestId("wizard-submit").click();
  await page.waitForURL(/\/game\/[^/]+\/manage$/, { timeout: 15000 });
}

/**
 * Override a traveller row to "1NT by North, making" (kept for existing callers
 * such as the traveller-live journey). Thin wrapper over
 * {@link overrideRowToContract}.
 */
export async function overrideRowToOneNotrump(
  page: Page,
  rowTestId: string,
  leadCardRequired: boolean,
): Promise<void> {
  await overrideRowToContract(
    page,
    rowTestId,
    { level: 1, suit: "NT", declarer: "N", result: { mode: "made", value: 0 } },
    { leadCardRequired },
  );
}

/**
 * Override a traveller row to an ADJUSTED score via the director wizard's
 * Adjusted Score path. From the row, opens the wizard, clicks "Adjusted Score"
 * on the level step, then either taps a preset (matched by its "(ns/ew)"
 * fragment) or fills the custom NS%/EW% inputs and submits. Waits for the
 * redirect back to the manage menu.
 *
 * The result is stored as `A{ns}/{ew}` and rendered in the traveller as
 * "Adj {ns}%/{ew}%".
 */
export async function overrideRowToAdjusted(
  page: Page,
  rowTestId: string,
  { nsPercent, ewPercent }: { nsPercent: number; ewPercent: number },
): Promise<void> {
  await page.getByTestId(rowTestId).click();

  // Level step exposes the director-only "Adjusted Score" button.
  await page.getByRole("button", { name: "Adjusted Score", exact: true }).click();

  // Custom entry: fill NS%/EW% and submit (covers arbitrary splits).
  await page.locator("#ns-percent").fill(String(nsPercent));
  await page.locator("#ew-percent").fill(String(ewPercent));
  await page.getByRole("button", { name: "Submit", exact: true }).click();

  await page.waitForURL(/\/game\/[^/]+\/manage$/, { timeout: 15000 });
}

/**
 * Override a traveller row to an ADJUSTED score via one of the wizard's PRESET
 * buttons (e.g. "AVE+ / AVE-  (60/40)"). Presets submit immediately (no custom
 * step), so this taps the preset whose "(ns/ew)" fragment matches. Waits for
 * the redirect back to the manage menu.
 *
 * The preset labels carry a double space before the parenthesis, so this
 * matches on the "(ns/ew)" fragment rather than the full label.
 */
export async function overrideRowToAdjustedPreset(
  page: Page,
  rowTestId: string,
  { nsPercent, ewPercent }: { nsPercent: number; ewPercent: number },
): Promise<void> {
  await page.getByTestId(rowTestId).click();

  await page.getByRole("button", { name: "Adjusted Score", exact: true }).click();

  // Tap the preset whose parenthetical split matches, e.g. "(60/40)".
  await page
    .getByRole("button", { name: new RegExp(`\\(${nsPercent}/${ewPercent}\\)`) })
    .click();

  await page.waitForURL(/\/game\/[^/]+\/manage$/, { timeout: 15000 });
}
