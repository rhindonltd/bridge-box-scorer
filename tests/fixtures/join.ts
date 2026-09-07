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

/**
 * Seat one pair at an explicit SECTION-QUALIFIED seat (e.g. "B1NS"), using the
 * seat button's stable `data-testid="seat-{seat}"`. Unlike {@link seatPair}
 * (which locates the direction button by position), this targets the exact
 * seat regardless of how many sections/tables precede it — required for
 * multi-section games where NS/EW labels repeat across sections.
 *
 * @returns the play route the app navigated to, e.g. `/game/{id}/play/B1NS`.
 */
export async function seatPairBySeat(
  page: Page,
  gameId: string,
  seat: string,
  ebu1: string,
  ebu2: string,
): Promise<string> {
  await page.goto(`/game/${gameId}/join`);

  const seatButton = page.getByTestId(`seat-${seat}`);
  await expect(seatButton).toBeVisible({ timeout: 15000 });
  await seatButton.click();

  // The seat suffix determines the two name labels.
  const isNS = seat.endsWith("NS");
  const label1 = isNS ? "North" : "East";
  const label2 = isNS ? "South" : "West";

  await fillSeat(page, label1, ebu1);
  await fillSeat(page, label2, ebu2);

  await page.getByRole("button", { name: "Enter Pair" }).click();
  await page.waitForURL(/\/game\/.+\/play\//, { timeout: 15000 });
  return page.url();
}

/**
 * Seat a full two-table field in a specific section using explicit seats.
 * Reuses the four seeded players (no distinct-player constraint).
 */
export async function seatTwoTableSection(
  page: Page,
  gameId: string,
  section: string,
): Promise<void> {
  const { jacquelineCollier, davidCollier, celiaOram, denisKing } = SEEDED_EBU;

  await seatPairBySeat(page, gameId, `${section}1NS`, jacquelineCollier, davidCollier);
  await seatPairBySeat(page, gameId, `${section}1EW`, celiaOram, denisKing);
  await seatPairBySeat(page, gameId, `${section}2NS`, jacquelineCollier, davidCollier);
  await seatPairBySeat(page, gameId, `${section}2EW`, celiaOram, denisKing);
}

/**
 * Seat every seat of an N-table single-section (section "A") field using the
 * seeded players (reused across tables — there is no distinct-player
 * constraint). Uses explicit section-qualified seats so it works for any table
 * count, not just two.
 */
export async function seatSingleSectionField(
  page: Page,
  gameId: string,
  tables: number,
): Promise<void> {
  const { jacquelineCollier, davidCollier, celiaOram, denisKing } = SEEDED_EBU;

  for (let table = 1; table <= tables; table++) {
    await seatPairBySeat(page, gameId, `A${table}NS`, jacquelineCollier, davidCollier);
    await seatPairBySeat(page, gameId, `A${table}EW`, celiaOram, denisKing);
  }
}

/**
 * A device factory: returns a fresh, isolated browser page (its own context,
 * localStorage and socket) — one per simulated pair, matching how each pair
 * uses their own phone in the room.
 */
export type MakePage = () => Promise<Page>;

/** The four section-A seats of a two-table field, in seating order. */
const TWO_TABLE_SEATS = ["A1NS", "A1EW", "A2NS", "A2EW"] as const;

/**
 * Seat a full two-table (section "A") field, giving EACH pair its OWN device.
 *
 * This mirrors reality: a pair joins on their own phone, so the seat's player
 * token is stored on that device and stays with them for the whole session
 * (including result submission, which is player-authorised). Seating everyone
 * from one shared page would leave a single overwritten token and no token on
 * the pages that actually play.
 *
 * @returns a map from section-qualified seat (e.g. "A1NS") to that pair's page.
 */
export async function seatTwoTableFieldOnDevices(
  makePage: MakePage,
  gameId: string,
): Promise<Record<string, Page>> {
  return seatSeatsOnDevices(makePage, gameId, [...TWO_TABLE_SEATS]);
}

/**
 * Seat a full two-table field for a specific section, one device per pair.
 *
 * @returns a map from section-qualified seat (e.g. "B1NS") to that pair's page.
 */
export async function seatTwoTableSectionOnDevices(
  makePage: MakePage,
  gameId: string,
  section: string,
): Promise<Record<string, Page>> {
  const seats = [
    `${section}1NS`,
    `${section}1EW`,
    `${section}2NS`,
    `${section}2EW`,
  ];
  return seatSeatsOnDevices(makePage, gameId, seats);
}

/**
 * Seat every seat of an N-table single-section (section "A") field, one device
 * per pair.
 *
 * @returns a map from section-qualified seat (e.g. "A1NS") to that pair's page.
 */
export async function seatSingleSectionFieldOnDevices(
  makePage: MakePage,
  gameId: string,
  tables: number,
): Promise<Record<string, Page>> {
  const seats: string[] = [];
  for (let table = 1; table <= tables; table++) {
    seats.push(`A${table}NS`, `A${table}EW`);
  }
  return seatSeatsOnDevices(makePage, gameId, seats);
}

/**
 * Seat an explicit list of section-qualified seats, each from its own device,
 * reusing the four seeded players (there is no distinct-player constraint).
 * Returns the seat -> page map so callers can drive play from the same device
 * that joined (and therefore holds that seat's token).
 */
export async function seatSeatsOnDevices(
  makePage: MakePage,
  gameId: string,
  seats: string[],
): Promise<Record<string, Page>> {
  const { jacquelineCollier, davidCollier, celiaOram, denisKing } = SEEDED_EBU;

  const pages: Record<string, Page> = {};
  for (const seat of seats) {
    const page = await makePage();
    const isNS = seat.endsWith("NS");
    const ebu1 = isNS ? jacquelineCollier : celiaOram;
    const ebu2 = isNS ? davidCollier : denisKing;
    await seatPairBySeat(page, gameId, seat, ebu1, ebu2);
    pages[seat] = page;
  }
  return pages;
}
