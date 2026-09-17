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
 * Reliably-seeded EBU players. A player may only be seated once per game (the
 * app rejects seating an already-seated EBU number), so a two-table field needs
 * eight distinct players — one pair per direction per table.
 */
export const SEEDED_EBU = {
  jacquelineCollier: "477484",
  davidCollier: "404476",
  celiaOram: "12269",
  denisKing: "16671",
  nigelFreake: "10008",
  bobCooke: "10009",
  sheilaSpencer: "10021",
  keithPonsford: "10056",
} as const;

/**
 * An ordered pool of distinct, reliably-seeded EBU numbers (all resolvable via
 * `/api/players/search?q=<ebu>`). A player may only be seated once per game, so
 * multi-seat fields must draw a UNIQUE pair per seat from this pool. Twenty
 * players (ten pairs) covers the largest field the journeys build: a 3-table
 * single section (6 pairs) and a two-section, two-tables-each field (8 pairs).
 * Add more from `data/players.db` if a larger field is ever needed.
 */
export const SEEDED_EBU_POOL: readonly string[] = [
  "477484", "404476", "12269", "16671",
  "10008", "10009", "10021", "10056",
  "10077", "10079", "10096", "10105",
  "10117", "10118", "10128", "10159",
  "10169", "10183", "10188", "10204",
] as const;

/**
 * Assign each seat a distinct pair (two EBU numbers) drawn in order from
 * {@link SEEDED_EBU_POOL}, so no player is seated twice in one game. Throws if
 * the draw would run off the end of the pool, which is a clearer failure than
 * the app's "already seated" rejection surfacing as a navigation timeout.
 *
 * `pairOffset` shifts the starting pair, so callers that seat several groups
 * into the SAME game (e.g. one call per section) can keep every player distinct
 * across the whole game by advancing the offset by `seats.length` per group.
 */
export function assignDistinctPairs(
  seats: string[],
  pairOffset = 0,
): Record<string, [string, string]> {
  const lastPlayerIndex = (pairOffset + seats.length) * 2 - 1;
  if (lastPlayerIndex >= SEEDED_EBU_POOL.length) {
    throw new Error(
      `Need ${lastPlayerIndex + 1} distinct players (offset ${pairOffset} + ` +
        `${seats.length} seats), but the seeded pool only has ` +
        `${SEEDED_EBU_POOL.length}. Add more EBU numbers to SEEDED_EBU_POOL ` +
        `(from data/players.db).`,
    );
  }
  const assignment: Record<string, [string, string]> = {};
  seats.forEach((seat, i) => {
    const p = (pairOffset + i) * 2;
    assignment[seat] = [SEEDED_EBU_POOL[p], SEEDED_EBU_POOL[p + 1]];
  });
  return assignment;
}

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
  // The play page opens a live (WebSocket) connection and keeps it open, so the
  // page's "load" event never fires; waiting for it (waitForURL's default)
  // would hang. Wait for the URL to change on navigation commit instead.
  await page.waitForURL(/\/game\/.+\/play\//, {
    timeout: 15000,
    waitUntil: "commit",
  });
  return page.url();
}

/**
 * Seat all four pairs of a two-table pairs game using the seeded players.
 * Runs from a single (director) context; each seat-join returns to `/join` for
 * the next pair. Uses eight distinct players, since a player cannot be seated
 * more than once in the same game.
 */
export async function seatTwoTableField(
  page: Page,
  gameId: string,
): Promise<void> {
  const {
    jacquelineCollier,
    davidCollier,
    celiaOram,
    denisKing,
    nigelFreake,
    bobCooke,
    sheilaSpencer,
    keithPonsford,
  } = SEEDED_EBU;

  await seatPair(page, gameId, 0, "NS", jacquelineCollier, davidCollier);
  await seatPair(page, gameId, 0, "EW", celiaOram, denisKing);
  await seatPair(page, gameId, 1, "NS", nigelFreake, bobCooke);
  await seatPair(page, gameId, 1, "EW", sheilaSpencer, keithPonsford);
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
  // The play page opens a live (WebSocket) connection and keeps it open, so the
  // page's "load" event never fires; waiting for it (waitForURL's default)
  // would hang. Wait for the URL to change on navigation commit instead.
  await page.waitForURL(/\/game\/.+\/play\//, {
    timeout: 15000,
    waitUntil: "commit",
  });
  return page.url();
}

/**
 * Seat a full two-table field in a specific section using explicit seats, one
 * distinct pair per seat (a player may only be seated once per game).
 */
export async function seatTwoTableSection(
  page: Page,
  gameId: string,
  section: string,
): Promise<void> {
  const seats = [
    `${section}1NS`,
    `${section}1EW`,
    `${section}2NS`,
    `${section}2EW`,
  ];
  const pairs = assignDistinctPairs(seats);

  for (const seat of seats) {
    const [ebu1, ebu2] = pairs[seat];
    await seatPairBySeat(page, gameId, seat, ebu1, ebu2);
  }
}

/**
 * Seat every seat of an N-table single-section (section "A") field, one
 * distinct pair per seat (a player may only be seated once per game). Uses
 * explicit section-qualified seats so it works for any table count, not just
 * two.
 */
export async function seatSingleSectionField(
  page: Page,
  gameId: string,
  tables: number,
): Promise<void> {
  const seats: string[] = [];
  for (let table = 1; table <= tables; table++) {
    seats.push(`A${table}NS`, `A${table}EW`);
  }
  const pairs = assignDistinctPairs(seats);

  for (const seat of seats) {
    const [ebu1, ebu2] = pairs[seat];
    await seatPairBySeat(page, gameId, seat, ebu1, ebu2);
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
 * Offsets into the player pool by section (A→0, B→4, …) so seating multiple
 * sections in the same game keeps every player distinct across sections (a
 * player may only be seated once per game).
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
  // Four seats per section; advance the pool offset one section-block per
  // section letter so sections never share players.
  const sectionIndex = section.toUpperCase().charCodeAt(0) - "A".charCodeAt(0);
  return seatSeatsOnDevices(makePage, gameId, seats, sectionIndex * seats.length);
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
 * giving every seat a DISTINCT pair (a player may only be seated once per
 * game). Returns the seat -> page map so callers can drive play from the same
 * device that joined (and therefore holds that seat's token).
 */
export async function seatSeatsOnDevices(
  makePage: MakePage,
  gameId: string,
  seats: string[],
  pairOffset = 0,
): Promise<Record<string, Page>> {
  const pairs = assignDistinctPairs(seats, pairOffset);

  const pages: Record<string, Page> = {};
  for (const seat of seats) {
    const page = await makePage();
    const [ebu1, ebu2] = pairs[seat];
    await seatPairBySeat(page, gameId, seat, ebu1, ebu2);
    pages[seat] = page;
  }
  return pages;
}
