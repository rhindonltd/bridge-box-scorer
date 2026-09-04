import { Page, expect } from "@playwright/test";

/**
 * Pure-UI seating helper. Drives the player-facing join flow at
 * `/game/{id}/join`: choose a table + direction, search each seat by EBU
 * number, pick the result, and submit the pair. On success the app routes to
 * `/game/{id}/play/{seat}`, which this helper waits for and returns.
 *
 * Seating carries no director auth, so pairs can be seated from the director
 * context or their own contexts interchangeably.
 */

export type Direction = "NS" | "EW";

/**
 * The four reliably-seeded EBU players. There is no distinct-player constraint
 * on seating, so the same players can fill both tables of a two-table game.
 */
export const SEEDED_EBU = {
  jacquelineCollier: "477484",
  davidCollier: "404476",
  celiaOram: "12269",
  denisKing: "16671",
} as const;

async function fillSeat(
  page: Page,
  label: "North" | "South" | "East" | "West",
  ebuNumber: string,
): Promise<void> {
  const input = page.getByTestId(`player-search-input-${label}`);
  await input.fill(ebuNumber);
  // Search is debounced (~250ms) and matches the full EBU number; wait for the
  // result button to appear rather than racing the debounce.
  const result = page.getByTestId("player-search-result").first();
  await expect(result).toBeVisible({ timeout: 10000 });
  await result.click();
}

/**
 * Seat one pair at the given table (0-based index) and direction.
 *
 * @returns the play route the app navigated to, e.g. `/game/{id}/play/A1NS`.
 */
export async function seatPair(
  page: Page,
  gameId: string,
  tableIndex: number,
  direction: Direction,
  ebu1: string,
  ebu2: string,
): Promise<string> {
  await page.goto(`/game/${gameId}/join`);
  await expect(
    page.getByRole("button", { name: direction, exact: true }).nth(tableIndex),
  ).toBeVisible({ timeout: 15000 });

  await page
    .getByRole("button", { name: direction, exact: true })
    .nth(tableIndex)
    .click();

  const label1 = direction === "NS" ? "North" : "East";
  const label2 = direction === "NS" ? "South" : "West";

  await fillSeat(page, label1, ebu1);
  await fillSeat(page, label2, ebu2);

  await page.getByRole("button", { name: "Enter Pair" }).click();
  await page.waitForURL(/\/game\/.+\/play\//, { timeout: 15000 });
  return page.url();
}

/**
 * Seat all four pairs of a two-table pairs game using the seeded players.
 * Runs from a single (director) context; each seat-join returns to `/join` for
 * the next pair. Reuses the four seeded players across both tables.
 */
export async function seatTwoTableField(
  page: Page,
  gameId: string,
): Promise<void> {
  const { jacquelineCollier, davidCollier, celiaOram, denisKing } = SEEDED_EBU;

  await seatPair(page, gameId, 0, "NS", jacquelineCollier, davidCollier);
  await seatPair(page, gameId, 0, "EW", celiaOram, denisKing);
  await seatPair(page, gameId, 1, "NS", jacquelineCollier, davidCollier);
  await seatPair(page, gameId, 1, "EW", celiaOram, denisKing);
}
