import { Db } from "@/db/games";
import { seatOccupancy, SeatOccupancy } from "@/db/games/tables/seat-occupancy";
import { eq } from "drizzle-orm";
import { PairSeat, scoredIdFor } from "@/model/participants";

/**
 * Whether an occupancy covers a given board number. A `boards = null` occupancy
 * covers EVERY board the seat plays (the whole-event common case); otherwise it
 * covers exactly the board numbers in its set.
 */
export function occupancyCoversBoard(
  occupancy: Pick<SeatOccupancy, "boards">,
  boardNumber: number,
): boolean {
  if (occupancy.boards == null) return true;
  return occupancy.boards.includes(boardNumber);
}

/** Read every occupancy row in the game. */
export async function readSeatOccupancies(db: Db): Promise<SeatOccupancy[]> {
  return db.select().from(seatOccupancy);
}

/**
 * The occupancies at a seat, in insertion order. In the common case this is a
 * single whole-seat (`boards = null`) occupancy; a handover seat has two.
 */
export async function readOccupanciesForSeat(
  db: Db,
  seat: string,
): Promise<SeatOccupancy[]> {
  return db
    .select()
    .from(seatOccupancy)
    .where(eq(seatOccupancy.seat, seat as PairSeat));
}

/**
 * Resolve the single occupant of a seat for a given board number — the
 * occupancy whose board set contains it. With the disjoint-set invariant there
 * is at most one. Pass `boardNumber = null` to get the seat's SOLE occupancy
 * (the ordinary single-occupancy case); when a seat has more than one occupancy
 * and no board is given, the first is returned (callers that care about
 * handover always pass a board).
 */
export function resolveOccupant(
  occupancies: readonly SeatOccupancy[],
  seat: string,
  boardNumber: number | null,
): SeatOccupancy | undefined {
  const forSeat = occupancies.filter((o) => o.seat === seat);
  if (forSeat.length === 0) return undefined;
  if (boardNumber == null) return forSeat[0];
  return (
    forSeat.find((o) => occupancyCoversBoard(o, boardNumber)) ??
    // Fall back to a whole-seat occupancy if present (defensive; a seat with a
    // single boards=null row is handled by the find above already).
    forSeat.find((o) => o.boards == null)
  );
}

/**
 * The minimal shape the DEVICE pick ({@link arrivalAnchorOf}) needs.
 * `isArrivalAnchor` is REQUIRED (not optional): the device identity is driven
 * by that flag, and a caller that selects occupancy rows without it would
 * silently fall back to the lowest id. Making it mandatory turns that mistake
 * into a compile error — spread {@link anchorPickColumns} into the `.select()`
 * to satisfy it. `split` stays optional (only the one-line/split resolvers read
 * it).
 */
type OccupantCandidate = {
  id: number;
  boards: number[] | null;
  isArrivalAnchor: number | null;
  /** §2.4.7 split flag (1 = score the two occupants as separate lines). */
  split?: number | null;
};

/**
 * The shape the RANKED / merged-line picks ({@link rankedOf}, {@link
 * mergedLineOf}, {@link primaryOf}, {@link primaryOccupancyIds}) need. Adds
 * `standing` (eligibility) and `isMainLine` (the director's main-pair choice)
 * on top of the device shape — BOTH required for the same reason: omitting
 * `isMainLine` from a select silently ignored the director's main-pair choice
 * (a bug found three times). Spread {@link rankedPickColumns} into the
 * `.select()` to satisfy it.
 */
type RankedCandidate = OccupantCandidate & {
  standing: SeatOccupancy["standing"];
  /** §2.4.7 merged-line "main pair" flag (1 = represents the one-line seat). */
  isMainLine: number | null;
};

/**
 * Column projection for a `.select()` that feeds the DEVICE pick
 * ({@link arrivalAnchorOf}) — e.g. the auth / secret-rotation readers. Spread
 * it so the required flag column is never forgotten:
 * `db.select({ ...anchorPickColumns, secretKey: seatOccupancy.secretKey })`.
 */
export const anchorPickColumns = {
  id: seatOccupancy.id,
  boards: seatOccupancy.boards,
  isArrivalAnchor: seatOccupancy.isArrivalAnchor,
} as const;

/**
 * Column projection for a `.select()` that feeds a RANKED / merged-line pick
 * ({@link rankedOf} / {@link mergedLineOf} / {@link primaryOf}). Includes the
 * device flag PLUS `standing` and `isMainLine`, so the director's eligibility
 * and main-pair choices are always honoured. Spread it into the select.
 */
export const rankedPickColumns = {
  ...anchorPickColumns,
  standing: seatOccupancy.standing,
  isMainLine: seatOccupancy.isMainLine,
} as const;

/**
 * The ARRIVAL ANCHOR among a seat's occupants — the one that took over the live
 * device and plays the seat forward (the later boards). This is the DEVICE /
 * forward-play identity: auth (which secret the live seat uses) and the "played
 * vs missed" split follow it, independent of standing.
 *
 * Picked by the explicit `isArrivalAnchor` flag the handover engine sets. For
 * an ordinary single occupancy (no flag) it falls back to the whole-seat
 * (`boards = null`) occupant, then the lowest id — so a non-handover seat is
 * unaffected.
 */
export function arrivalAnchorOf<T extends OccupantCandidate>(
  forSeat: readonly T[],
): T {
  const flagged = forSeat.find((o) => o.isArrivalAnchor === 1);
  if (flagged) return flagged;
  const whole = forSeat.find((o) => o.boards == null);
  if (whole) return whole;
  return forSeat.reduce((lo, o) => (o.id < lo.id ? o : lo), forSeat[0]);
}

/**
 * The MERGED-LINE occupant of a seat — the "main pair" that represents the one
 * ranked line and the one USEBIO `<PAIR>` when the seat scores as a single
 * contestant (`split = 0`). Its names + EBU numbers are the line; the other
 * occupant rides along as the local "(Sub)" name.
 *
 * Picked by the director-settable `isMainLine` flag (set on exactly one
 * occupant on the Substitutions screen). When nothing is chosen it falls back
 * to {@link arrivalAnchorOf} — the arriving pair — so a freshly handed-over
 * seat and every pre-existing game behave as before.
 *
 * This is the SCORING/EXPORT identity, kept SEPARATE from {@link arrivalAnchorOf}
 * (the DEVICE identity): the main pair drives names/ranking/USEBIO, while auth
 * (which secret the live seat uses) always follows the arrival anchor. Changing
 * the main pair must never move the device identity.
 */
export function mergedLineOf<T extends RankedCandidate>(
  forSeat: readonly T[],
): T {
  return forSeat.find((o) => o.isMainLine === 1) ?? arrivalAnchorOf(forSeat);
}

/**
 * The RANKED occupant of a seat — the one whose board-id (and scored-field id)
 * stays the bare seat, which `findPairs` returns as the seat's ranked pair, and
 * which the leaderboard places.
 *
 * Ranked = the occupant that is NOT `WITHOUT_STANDING`. On a §2.4.7 handover
 * seat the director marks AT MOST ONE occupant without standing (on the
 * Substitutions screen); the other is ranked. When NEITHER is without standing
 * (a clean substitution, or the ordinary single occupancy) the ranked one is
 * the ARRIVAL ANCHOR — it owns the open-ended tail and the seat's continuous
 * line. The defensive both-without-standing case also falls back to the anchor.
 *
 * NOTE: this is the SCORING/ranking identity, kept separate from
 * {@link arrivalAnchorOf} (the device identity). They coincide for the common
 * stand-in→real handover, but diverge when the director marks the ARRIVING pair
 * without standing — then the earlier occupant is ranked while the arriving
 * pair still holds the device.
 */
export function rankedOf<T extends RankedCandidate>(forSeat: readonly T[]): T {
  const withStanding = forSeat.filter((o) => o.standing !== "WITHOUT_STANDING");
  if (withStanding.length === 1) return withStanding[0];
  // Neither (substitution / single occupancy) or both (defensive) without
  // standing → the director's chosen MAIN pair owns the ranked line (default:
  // the arrival anchor). Using mergedLineOf here is what lets the director
  // re-point which pair's name + EBU record is the one merged line.
  const pool = withStanding.length > 0 ? withStanding : forSeat;
  return mergedLineOf(pool);
}

/**
 * Back-compat alias. Historically "primary" meant "the ranked occupant"; most
 * call sites want exactly that, so they keep working via {@link rankedOf}. The
 * two auth call sites that actually need the DEVICE identity use
 * {@link arrivalAnchorOf} instead.
 */
export const primaryOf = rankedOf;

/**
 * Whether a handover seat scores as ONE continuous line (`split = 0`, the
 * default) rather than two separate lines. One line = both occupants' boards
 * fold onto the ranked occupant's bare id (the seat is a single contestant;
 * leaderboard stitches both names; USEBIO emits one `<PAIR>`). When split, each
 * occupant is its own scored line over only its own boards (the non-ranked one
 * getting a `#<occId>` id), and eligibility (`standing`) decides whether each is
 * ranked.
 *
 * Reads the seat's `split` flag (carried on both occupancies). A freshly
 * handed-over seat is one line until the director chooses "split by board".
 */
function seatIsOneLine(forSeat: readonly OccupantCandidate[]): boolean {
  return !forSeat.some((o) => o.split === 1);
}

/**
 * The set of RANKED occupancy ids across the game, grouped by seat. For an
 * ordinary game (one occupancy per seat) every id is ranked; a handover seat
 * contributes only its ranked occupant, so the other is excluded. Used by
 * `findPairs` to keep "the seated pairs" one-per-seat.
 */
export function primaryOccupancyIds<
  T extends RankedCandidate & { initialSeat: string },
>(occupancies: readonly T[]): Set<number> {
  const bySeat = new Map<string, T[]>();
  for (const o of occupancies) {
    const arr = bySeat.get(o.initialSeat) ?? [];
    arr.push(o);
    bySeat.set(o.initialSeat, arr);
  }
  const ids = new Set<number>();
  for (const forSeat of bySeat.values()) ids.add(rankedOf(forSeat).id);
  return ids;
}

/**
 * A per-(board-id, board) resolver for the SCORING path. Given every occupancy
 * in the game, returns a function from `(boardAnchorId, boardNumber)` to the
 * scored-field id to use for that cell.
 *
 * - A seat with ONE occupancy (every ordinary game) → the bare `boardAnchorId`,
 *   unchanged. The whole scoring/USEBIO pipeline is therefore untouched unless a
 *   seat actually has a handover.
 * - A seat with TWO+ occupancies (a §2.4.7 handover) → the bare id for the board
 *   the PRIMARY occupant covers, and `<boardAnchorId>#<occId>` for a board a
 *   NON-PRIMARY occupant (the stand-in) covers. The suffix makes the stand-in a
 *   distinct ranked line (see {@link scoredIdFor}); the caller excludes it from
 *   the ranking so its results count for opponents only.
 *
 * A board the occupancy sets don't cover (shouldn't happen under the
 * disjoint-cover invariant) falls back to the bare id.
 */
export function buildOccupantScoredIdResolver(
  occupancies: readonly SeatOccupancy[],
): (boardAnchorId: string, boardNumber: number) => string {
  // Group by the board-id (anchorId ?? seat) so we match a board row's ns/ew.
  const bySeatBoardId = new Map<string, SeatOccupancy[]>();
  for (const o of occupancies) {
    const key = o.anchorId ?? o.seat;
    const arr = bySeatBoardId.get(key) ?? [];
    arr.push(o);
    bySeatBoardId.set(key, arr);
  }

  return (boardAnchorId, boardNumber) => {
    const forSeat = bySeatBoardId.get(boardAnchorId);
    // No occupancy (phantom / sit-out / expected-late empty seat) or exactly
    // one → the bare id, i.e. behaviour identical to pre-handover.
    if (forSeat == null || forSeat.length <= 1) return boardAnchorId;

    // SUBSTITUTION / INHERIT: the gap boards stay on the seat's bare id so the
    // ranked pair is scored on the other occupant's actual results — one line,
    // no `#<occId>` split.
    if (seatIsOneLine(forSeat)) return boardAnchorId;

    // SPLIT: the ARRIVAL ANCHOR keeps the bare id; the other occupant's boards
    // split to `<boardId>#<occId>` as its own separate line. (Whether each line
    // is ranked is decided by `standing` downstream — split is about identity,
    // not eligibility.)
    const anchorId = arrivalAnchorOf(forSeat).id;
    const occupant =
      forSeat.find((o) => occupancyCoversBoard(o, boardNumber)) ??
      forSeat.find((o) => o.boards == null);
    if (occupant == null || occupant.id === anchorId) return boardAnchorId;
    return scoredIdFor(boardAnchorId, occupant.id);
  };
}

/**
 * A map from each occupancy's surrogate `id` to its SCORED-FIELD id — the bare
 * board id for a seat's primary occupant, and `<boardId>#<occId>` for a
 * non-primary (handover stand-in). For an ordinary game every value is the bare
 * board id. Lets a per-occupancy reader (e.g. the standings resolver) key each
 * occupancy's lifecycle fact to the SAME id its board rows carry after the
 * scoring-path rewrite, so a stand-in's WITHOUT_STANDING no longer collides with
 * the real pair's standing on the shared seat.
 */
export function scoredIdByOccupancyId(
  occupancies: readonly SeatOccupancy[],
): Map<number, string> {
  const bySeatBoardId = new Map<string, SeatOccupancy[]>();
  for (const o of occupancies) {
    const key = o.anchorId ?? o.seat;
    const arr = bySeatBoardId.get(key) ?? [];
    arr.push(o);
    bySeatBoardId.set(key, arr);
  }

  const out = new Map<number, string>();
  for (const [boardAnchorId, forSeat] of bySeatBoardId) {
    // A single occupancy, OR a ONE-LINE handover (both occupants collapse into
    // the one bare-id line — no separate scored line): every occupancy maps to
    // the bare board id.
    if (forSeat.length <= 1 || seatIsOneLine(forSeat)) {
      for (const o of forSeat) out.set(o.id, boardAnchorId);
      continue;
    }
    // SPLIT: the arrival anchor keeps the bare id; the other occupant gets its
    // own `#<occId>` id (its own line).
    const anchorId = arrivalAnchorOf(forSeat).id;
    for (const o of forSeat) {
      out.set(
        o.id,
        o.id === anchorId ? boardAnchorId : scoredIdFor(boardAnchorId, o.id),
      );
    }
  }
  return out;
}

/**
 * The surrogate ids of the NON-ANCHOR occupants of every ONE-LINE (split = 0)
 * handover seat. When the seat folds to one line the non-anchor occupant has no
 * scoring identity of its own — its boards score as the one ranked line's
 * results on the shared bare id — so it must be dropped from any per-occupancy
 * standings read (otherwise its standing would collide with, and could wrongly
 * exclude, the one line on the shared bare id). A SPLIT seat keeps both
 * occupants as distinct ids, so nothing is dropped there. Empty for a game with
 * no one-line handover.
 */
export function inheritStandInOccupancyIds(
  occupancies: readonly SeatOccupancy[],
): Set<number> {
  const bySeatBoardId = new Map<string, SeatOccupancy[]>();
  for (const o of occupancies) {
    const key = o.anchorId ?? o.seat;
    const arr = bySeatBoardId.get(key) ?? [];
    arr.push(o);
    bySeatBoardId.set(key, arr);
  }

  const ids = new Set<number>();
  for (const forSeat of bySeatBoardId.values()) {
    if (forSeat.length <= 1) continue;
    if (!seatIsOneLine(forSeat)) continue;
    // The MAIN pair owns the one merged line; the OTHER occupant has no scoring
    // identity of its own and must be dropped from the standings read.
    const mainId = mergedLineOf(forSeat).id;
    for (const o of forSeat) if (o.id !== mainId) ids.add(o.id);
  }
  return ids;
}

/**
 * For every ONE-LINE (split = 0) handover seat, map the MAIN (ranked)
 * occupancy's id → the OTHER occupant on that seat (the pair whose boards fold
 * onto the merged line). This is the data the leaderboard needs to STITCH both
 * pairs' names onto the one ranked line (the main pair is already surfaced by
 * `findPairs`; this adds the hidden partner, shown as "(Sub)"). A SPLIT seat is
 * excluded (both occupants are already their own lines), as is an ordinary
 * single occupancy. Keyed by the MAIN occupancy's id because `findPairs`
 * returns the main pair as the seat's ranked pair under that id — so when the
 * director re-points the main pair, the "(Sub)" partner flips accordingly.
 */
export function oneLineSecondaryByAnchorId(
  occupancies: readonly SeatOccupancy[],
): Map<number, SeatOccupancy> {
  const bySeatBoardId = new Map<string, SeatOccupancy[]>();
  for (const o of occupancies) {
    const key = o.anchorId ?? o.seat;
    const arr = bySeatBoardId.get(key) ?? [];
    arr.push(o);
    bySeatBoardId.set(key, arr);
  }

  const out = new Map<number, SeatOccupancy>();
  for (const forSeat of bySeatBoardId.values()) {
    if (forSeat.length <= 1) continue;
    if (!seatIsOneLine(forSeat)) continue;
    const main = mergedLineOf(forSeat);
    // v1 supports a single handover per seat → exactly one "other" occupant.
    const other = forSeat.find((o) => o.id !== main.id);
    if (other) out.set(main.id, other);
  }
  return out;
}

/**
 * A separate (non-anchor) occupant of a SPLIT handover seat, with its
 * scored-field id and full player rows — the shape USEBIO needs to emit a
 * `<PAIR>` for it. Under `split = 1` the two occupants are distinct contestants,
 * each on its own boards; this surfaces the non-anchor one (the anchor keeps the
 * bare seat id and is emitted as the ordinary pair). Its eligibility (whether it
 * is placed) is decided by `standing` downstream, NOT here. A ONE-LINE seat
 * (`split = 0`) folds both occupants into the anchor's line, so it contributes
 * nothing. Empty for a game with no split handover.
 */
export interface NonPrimaryOccupantPair {
  /** The scored-field id: `<seat>#<occupancyId>` (section-qualified). */
  scoredId: string;
  /** The physical seat (for direction / section). */
  seat: string;
  player1: { id: number; firstName: string; lastName: string; nationalId: string | null };
  player2: { id: number; firstName: string; lastName: string; nationalId: string | null };
}

export async function findNonPrimaryOccupantPairs(
  db: Db,
): Promise<NonPrimaryOccupantPair[]> {
  const occupancies = await readSeatOccupancies(db);

  // Which occupancy ids are non-primary (per board-id group).
  const bySeatBoardId = new Map<string, SeatOccupancy[]>();
  for (const o of occupancies) {
    const key = o.anchorId ?? o.seat;
    const arr = bySeatBoardId.get(key) ?? [];
    arr.push(o);
    bySeatBoardId.set(key, arr);
  }
  const nonPrimary: { occ: SeatOccupancy; scoredId: string }[] = [];
  for (const [boardAnchorId, forSeat] of bySeatBoardId) {
    if (forSeat.length <= 1) continue;
    // ONE-LINE (split = 0): the non-anchor occupant has no separate scored line
    // (its boards fold onto the anchor's), so USEBIO emits no distinct `<PAIR>`
    // for it — only the single stitched pair.
    if (seatIsOneLine(forSeat)) continue;
    // SPLIT: the non-anchor occupant is its own `<PAIR>`.
    const anchorId = arrivalAnchorOf(forSeat).id;
    for (const o of forSeat) {
      if (o.id !== anchorId) {
        nonPrimary.push({ occ: o, scoredId: scoredIdFor(boardAnchorId, o.id) });
      }
    }
  }
  if (nonPrimary.length === 0) return [];

  // Resolve player rows for the non-anchor occupants.
  const { players } = await import("@/db/games/tables/players");
  const playerRows = await db.select().from(players);
  const byId = new Map(playerRows.map((p) => [p.id, p]));

  const result: NonPrimaryOccupantPair[] = [];
  for (const { occ, scoredId } of nonPrimary) {
    const p1 = byId.get(occ.player1);
    const p2 = byId.get(occ.player2);
    if (!p1 || !p2) continue;
    result.push({ scoredId, seat: occ.seat, player1: p1, player2: p2 });
  }
  return result;
}
