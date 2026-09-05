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

/**
 * A single-side contract specification for the played-contract helpers.
 *
 * `suit` uses the model's `ContractSuit` codes (S/H/D/C/NT). `declarer` is one
 * of N/E/S/W. `doubling` is "" (undoubled), "X" (doubled) or "XX" (redoubled).
 * `result` describes the outcome: `made` with `value` 0 (exactly, "=") or a
 * positive overtrick count ("+n"); `down` with a positive undertrick count
 * ("-n").
 */
export interface ContractSpec {
  level: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  suit: "S" | "H" | "D" | "C" | "NT";
  declarer: "N" | "E" | "S" | "W";
  doubling?: "" | "X" | "XX";
  result: { mode: "made" | "down"; value: number };
}

/** Suit-code → glyph, mirroring `SuitMap` in `src/model/common.ts`. */
const SUIT_GLYPH: Record<ContractSpec["suit"], string> = {
  S: "\u2660", // ♠
  H: "\u2665", // ♥
  D: "\u2666", // ♦
  C: "\u2663", // ♣
  NT: "NT",
};

/**
 * Build the exact declarer-button label the wizard renders on the Declarer
 * step. NT contracts read `{level}NT{declarer}{dbl}` (e.g. "1NTN"); suited
 * contracts use the suit GLYPH (e.g. "4♥N"), matching `StepDeclarer.tsx`.
 */
function declarerButtonName(spec: ContractSpec): string {
  const dbl = spec.doubling ?? "";
  if (spec.suit === "NT") {
    return `${spec.level}NT${spec.declarer}${dbl}`;
  }
  return `${spec.level}${SUIT_GLYPH[spec.suit]}${spec.declarer}${dbl}`;
}

/** The result-grid button label: "=", "+n" (made) or "-n" (down). */
function resultButtonName(result: ContractSpec["result"]): string {
  if (result.mode === "made") {
    return result.value === 0 ? "=" : `+${result.value}`;
  }
  return `-${result.value}`;
}

/** Escape a string for use inside a RegExp. */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Click a wizard button by its EXACT trimmed text content. Several wizard
 * steps render a coloured suit-glyph inside a nested span; matching on the
 * accessible name via `getByRole` is unreliable for those glyphs in WebKit, so
 * we anchor on text content instead. The label is matched exactly (`^…$`).
 */
async function clickButtonByText(page: Page, label: string): Promise<void> {
  const button = page
    .locator("button")
    .filter({ hasText: new RegExp(`^${escapeRegExp(label)}$`) });
  await expect(button.first()).toBeVisible({ timeout: 15000 });
  await button.first().click();
}

/**
 * Walk the ContractWizard for a single seat to enter a fully played contract
 * on a specific board, mirroring {@link enterPassOut} but for a real contract.
 *
 * Steps: open the seat, Enter Round, pick the board, Level, Suit, Declarer
 * (+ doubling), optional Opening Lead (when `leadCardRequired`), Made/Down
 * result, Submit. Leaves the page in whatever state the flow lands in —
 * "Waiting for confirmation" (first side) or "Board Results" (second side).
 *
 * The played-contract steps have no test ids; they are addressed by role+name
 * exactly as `tests/fixtures/director-override.ts` does. `leadCardRequired`
 * must match how the game was created (defaults to true, matching the app).
 */
export async function enterPlayedContract(
  page: Page,
  gameId: string,
  seat: string,
  boardNumber: number,
  spec: ContractSpec,
  { leadCardRequired = true }: { leadCardRequired?: boolean } = {},
): Promise<void> {
  await page.goto(`/game/${gameId}/play/${seat}`);

  const enterRound = page.getByTestId("play-enter-round");
  await expect(enterRound).toBeVisible({ timeout: 15000 });
  await enterRound.click();

  const boardButton = page.getByTestId(`wizard-board-${boardNumber}`);
  await expect(boardButton).toBeVisible({ timeout: 15000 });
  await boardButton.click();

  // Step: Level.
  await clickButtonByText(page, String(spec.level));

  // Step: Suit — labelled "{level}{glyph}" or "{level}NT". These buttons embed
  // a coloured suit-glyph span, so match on exact text content rather than the
  // accessible name (which is unreliable for the glyph in WebKit).
  const suitName =
    spec.suit === "NT"
      ? `${spec.level}NT`
      : `${spec.level}${SUIT_GLYPH[spec.suit]}`;
  await clickButtonByText(page, suitName);

  // Step: Declarer (with the doubling toggle applied first). Doubling buttons
  // read "None" / "X" / "XX"; declarer buttons read e.g. "4♥N" / "1NTN".
  const dbl = spec.doubling ?? "";
  if (dbl) {
    await clickButtonByText(page, dbl);
  }
  await clickButtonByText(page, declarerButtonName(spec));

  // Step: Opening Lead (only when the game records it). Default to ♠A.
  if (leadCardRequired) {
    await clickButtonByText(page, SUIT_GLYPH.S);
    await clickButtonByText(page, "A");
    await clickButtonByText(page, "Next");
  }

  // Step: Result — Made is the default mode; switch to Down when needed.
  if (spec.result.mode === "down") {
    await clickButtonByText(page, "Down");
  }
  await clickButtonByText(page, resultButtonName(spec.result));

  // Step: Confirm.
  const submit = page.getByTestId("wizard-submit");
  await expect(submit).toBeVisible();
  await submit.click();
}

/**
 * Confirm a board by entering the SAME played contract from both sides of a
 * table, mirroring {@link confirmBoardPassOut}. NS enters first and lands on
 * "Waiting for confirmation"; EW then enters the matching contract and the
 * board confirms, flipping NS to "Board Results".
 */
export async function confirmBoardPlayedContract(
  nsPage: Page,
  ewPage: Page,
  gameId: string,
  table: number,
  boardNumber: number,
  spec: ContractSpec,
  {
    section = "A",
    leadCardRequired = true,
  }: { section?: string; leadCardRequired?: boolean } = {},
): Promise<void> {
  const nsSeat = `${section}${table}NS`;
  const ewSeat = `${section}${table}EW`;

  await enterPlayedContract(nsPage, gameId, nsSeat, boardNumber, spec, {
    leadCardRequired,
  });
  await expect(nsPage.getByText("Waiting for confirmation")).toBeVisible({
    timeout: 15000,
  });

  await enterPlayedContract(ewPage, gameId, ewSeat, boardNumber, spec, {
    leadCardRequired,
  });

  await expect(nsPage.getByText("Board Results")).toBeVisible({
    timeout: 15000,
  });
}

/**
 * Lower-level single-side entry used by the mismatch journey, where the two
 * sides deliberately submit DIFFERENT boards and/or contracts. Unlike
 * {@link enterPlayedContract} it does not assume matching input across seats;
 * callers drive each seat explicitly and assert the resulting state.
 *
 * This is a thin alias over {@link enterPlayedContract} kept as a named seam so
 * mismatch tests read intentionally ("enter this side's own result").
 */
export async function enterContractRaw(
  page: Page,
  gameId: string,
  seat: string,
  boardNumber: number,
  spec: ContractSpec,
  opts: { leadCardRequired?: boolean } = {},
): Promise<void> {
  await enterPlayedContract(page, gameId, seat, boardNumber, spec, opts);
}
