import { scoredIdFor } from "@/model/participants";
import type { OccupancyRecord } from "@/model/standings";

/**
 * Who a board is credited to on a §2.4.7 handover seat: the pure picks over a
 * seat's occupancies, and the scored-field id each board row is rewritten to
 * before scoring. The database reads stay in `db/games/queries/seat-occupancy`.
 */

/**
 * Whether an occupancy covers a given board number. A `boards = null` occupancy
 * covers EVERY board the seat plays (the whole-event common case); otherwise it
 * covers exactly the board numbers in its set.
 */
export function occupancyCoversBoard(
  occupancy: Pick<OccupancyRecord, "boards">,
  boardNumber: number,
): boolean {
  if (occupancy.boards == null) return true;
  return occupancy.boards.includes(boardNumber);
}

/**
 * The minimal shape the DEVICE pick ({@link arrivalAnchorOf}) needs.
 * `isArrivalAnchor` is REQUIRED (not optional): the device identity is driven
 * by that flag, and a caller that selects occupancy rows without it would
 * silently fall back to the lowest id. Making it mandatory turns that mistake
 * into a compile error — spread `anchorPickColumns` (seat-occupancy queries)
 * into the `.select()` to satisfy it. `split` stays optional (only the
 * one-line/split resolvers read it).
 */
export type OccupantCandidate = {
  id: number;
  boards: number[] | null;
  isArrivalAnchor: number | null;
  /** §2.4.7 split flag (1 = score the two occupants as separate lines). */
  split?: number | null;
};

/**
 * The shape the RANKED / merged-line picks ({@link mergedLineOf}, and
 * `rankedOf` / `primaryOccupancyIds` in the seat-occupancy queries) need. Adds
 * `standing` (eligibility) and `isMainLine` (the director's main-pair choice)
 * on top of the device shape — BOTH required for the same reason: omitting
 * `isMainLine` from a select silently ignored the director's main-pair choice
 * (a bug found three times). Spread `rankedPickColumns` into the `.select()`
 * to satisfy it.
 */
export type RankedCandidate = OccupantCandidate & {
  standing: OccupancyRecord["standing"];
  /** §2.4.7 merged-line "main pair" flag (1 = represents the one-line seat). */
  isMainLine: number | null;
};

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
export function seatIsOneLine(forSeat: readonly OccupantCandidate[]): boolean {
  return !forSeat.some((o) => o.split === 1);
}

/** Group occupancies by their board id (`anchorId ?? seat`), the id board rows carry. */
function byBoardId<T extends Pick<OccupancyRecord, "anchorId" | "seat">>(
  occupancies: readonly T[],
): Map<string, T[]> {
  const bySeatBoardId = new Map<string, T[]>();
  for (const o of occupancies) {
    const key = o.anchorId ?? o.seat;
    const arr = bySeatBoardId.get(key) ?? [];
    arr.push(o);
    bySeatBoardId.set(key, arr);
  }
  return bySeatBoardId;
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
  occupancies: readonly OccupancyRecord[],
): (boardAnchorId: string, boardNumber: number) => string {
  // Group by the board-id (anchorId ?? seat) so we match a board row's ns/ew.
  const bySeatBoardId = byBoardId(occupancies);

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
    // (A whole-seat occupant — `boards` null — covers every board.)
    const occupant = forSeat.find((o) => occupancyCoversBoard(o, boardNumber));
    if (occupant == null || occupant.id === anchorId) return boardAnchorId;
    return scoredIdFor(boardAnchorId, occupant.id);
  };
}

/**
 * A map from each occupancy's surrogate `id` to its SCORED-FIELD id — the bare
 * board id for a seat's primary occupant, and `<boardId>#<occId>` for a
 * non-primary (handover stand-in). For an ordinary game every value is the bare
 * board id. Lets a per-occupancy reader (e.g. the standings derivation) key each
 * occupancy's lifecycle fact to the SAME id its board rows carry after the
 * scoring-path rewrite, so a stand-in's WITHOUT_STANDING no longer collides with
 * the real pair's standing on the shared seat.
 */
export function scoredIdByOccupancyId(
  occupancies: readonly OccupancyRecord[],
): Map<number, string> {
  const out = new Map<number, string>();
  for (const [boardAnchorId, forSeat] of byBoardId(occupancies)) {
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
  occupancies: readonly OccupancyRecord[],
): Set<number> {
  const ids = new Set<number>();
  for (const forSeat of byBoardId(occupancies).values()) {
    if (forSeat.length <= 1) continue;
    if (!seatIsOneLine(forSeat)) continue;
    // The MAIN pair owns the one merged line; the OTHER occupant has no scoring
    // identity of its own and must be dropped from the standings read.
    const mainId = mergedLineOf(forSeat).id;
    for (const o of forSeat) if (o.id !== mainId) ids.add(o.id);
  }
  return ids;
}
