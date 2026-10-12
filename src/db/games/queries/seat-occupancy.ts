import { Db } from "@/db/games";
import { seatOccupancy, SeatOccupancy } from "@/db/games/tables/seat-occupancy";
import { eq } from "drizzle-orm";
import { PairSeat, scoredIdFor } from "@/model/participants";
import type { WithdrawalRecord } from "@/db/games/queries/ranking-exclusions";

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
 * The minimal shape the primary-occupancy pick needs: the surrogate `id`, the
 * `boards` set (null = whole seat), and the `standing` (so a stand-in is
 * recognised semantically, not by insert order).
 */
type PrimaryCandidate = {
  id: number;
  boards: number[] | null;
  standing: SeatOccupancy["standing"];
};

/**
 * The PRIMARY occupancy among a seat's occupants — the one whose board-id (and
 * scored-field id) stays the bare seat, and the one `findPairs` returns as the
 * seat's ranked pair.
 *
 * The pick is SEMANTIC, not positional: a §2.4.7 handover stand-in is always
 * `WITHOUT_STANDING` (it plays for its opponents only), so the primary is the
 * occupant that is NOT without-standing — the real pair, which owns the
 * open-ended tail and is ranked. Ties (an ordinary single occupancy, or the
 * defensive case of two same-standing rows) fall back to the whole-seat
 * (`boards = null`) occupancy, then the lowest `id`. Choosing by standing rather
 * than insert order means the real pair is primary however the two occupancies
 * came to exist.
 */
export function primaryOf<T extends PrimaryCandidate>(forSeat: readonly T[]): T {
  const ranked = forSeat.filter((o) => o.standing !== "WITHOUT_STANDING");
  const pool = ranked.length > 0 ? ranked : forSeat;
  const whole = pool.find((o) => o.boards == null);
  if (whole) return whole;
  return pool.reduce((lo, o) => (o.id < lo.id ? o : lo), pool[0]);
}

/**
 * The set of PRIMARY occupancy ids across the game, grouped by seat. For an
 * ordinary game (one occupancy per seat) every id is primary; a handover seat
 * contributes only its primary (the real pair), so the stand-in is excluded.
 * Used by `findPairs` to keep "the seated pairs" one-per-seat.
 */
export function primaryOccupancyIds<
  T extends PrimaryCandidate & { initialSeat: string },
>(occupancies: readonly T[]): Set<number> {
  const bySeat = new Map<string, T[]>();
  for (const o of occupancies) {
    const arr = bySeat.get(o.initialSeat) ?? [];
    arr.push(o);
    bySeat.set(o.initialSeat, arr);
  }
  const ids = new Set<number>();
  for (const forSeat of bySeat.values()) ids.add(primaryOf(forSeat).id);
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

    const primaryId = primaryOf(forSeat).id;
    const occupant =
      forSeat.find((o) => occupancyCoversBoard(o, boardNumber)) ??
      forSeat.find((o) => o.boards == null);
    if (occupant == null || occupant.id === primaryId) return boardAnchorId;
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
    if (forSeat.length <= 1) {
      for (const o of forSeat) out.set(o.id, boardAnchorId);
      continue;
    }
    const primaryId = primaryOf(forSeat).id;
    for (const o of forSeat) {
      out.set(
        o.id,
        o.id === primaryId ? boardAnchorId : scoredIdFor(boardAnchorId, o.id),
      );
    }
  }
  return out;
}

/**
 * The scored-field ids of every NON-PRIMARY occupant (the stand-ins) of any
 * handover seat — the ids to drop from the ranking (§2.4.9 "without standing":
 * their results count for opponents but they are not ranked). Empty for every
 * game with no handover.
 */
export function nonPrimaryOccupantScoredIds(
  occupancies: readonly SeatOccupancy[],
): Set<string> {
  const bySeatBoardId = new Map<string, SeatOccupancy[]>();
  for (const o of occupancies) {
    const key = o.anchorId ?? o.seat;
    const arr = bySeatBoardId.get(key) ?? [];
    arr.push(o);
    bySeatBoardId.set(key, arr);
  }

  const ids = new Set<string>();
  for (const [boardAnchorId, forSeat] of bySeatBoardId) {
    if (forSeat.length <= 1) continue;
    const primaryId = primaryOf(forSeat).id;
    for (const o of forSeat) {
      if (o.id !== primaryId) ids.add(scoredIdFor(boardAnchorId, o.id));
    }
  }
  return ids;
}

/**
 * The §2.4.7 handover gap credits — one {@link WithdrawalRecord} per handover
 * seat's PRIMARY occupant (the real pair), carrying the exact set of boards it
 * did NOT play (the stand-in's boards) to be scored AVE− for it.
 *
 * A seat is a handover when it has more than one occupancy. Its gap is the
 * board numbers that seat plays (read from the board rows carrying its board
 * id) minus the boards the primary occupancy covers. The record's standing
 * mirrors the primary occupancy — a PENALISED real pair carries its fine; a
 * REMOVE one gets no self-credit (handled downstream) — so the arriving pair's
 * early boards score exactly like a §2.4.6 late-arrival gap. Empty for every
 * game with no handover.
 *
 * `boardRows` carry the board id on `ns`/`ew` (equal to each seat's
 * `anchorId ?? seat`), so the seat's played board numbers are the distinct
 * board numbers on rows whose `ns` or `ew` is that id.
 */
export function handoverRealPairGaps(
  occupancies: readonly SeatOccupancy[],
  boardRows: readonly { ns: string; ew: string; boardNumber: number }[],
): WithdrawalRecord[] {
  const bySeatBoardId = new Map<string, SeatOccupancy[]>();
  for (const o of occupancies) {
    const key = o.anchorId ?? o.seat;
    const arr = bySeatBoardId.get(key) ?? [];
    arr.push(o);
    bySeatBoardId.set(key, arr);
  }

  const records: WithdrawalRecord[] = [];
  for (const [boardAnchorId, forSeat] of bySeatBoardId) {
    if (forSeat.length <= 1) continue; // not a handover seat

    const primary = primaryOf(forSeat);
    // Boards the primary occupant actually covers (its own range).
    const covered =
      primary.boards == null ? null : new Set(primary.boards);

    // All board numbers this seat plays, from the board rows carrying its id.
    const seatBoards = new Set<number>();
    for (const row of boardRows) {
      if (row.ns === boardAnchorId || row.ew === boardAnchorId) {
        seatBoards.add(row.boardNumber);
      }
    }

    // The gap: boards the seat plays that the primary occupant did NOT cover
    // (i.e. the stand-in played them). A `boards = null` primary covers
    // everything → no gap (not a real handover; defensive).
    const gap = new Set<number>();
    if (covered != null) {
      for (const b of seatBoards) if (!covered.has(b)) gap.add(b);
    }
    if (gap.size === 0) continue;

    records.push({
      seat: boardAnchorId,
      treatment: primary.withdrawalTreatment ?? "PENALISED",
      finePercent:
        primary.withdrawalTreatment === "PENALISED"
          ? (primary.withdrawalFinePercent ?? 0)
          : 0,
      unplayedBoards: gap,
    });
  }
  return records;
}

/**
 * A non-primary occupant (a handover stand-in), with its scored-field id and
 * full player rows — the shape USEBIO needs to emit a `<PAIR>` for the stand-in
 * (so its `TRAVELLER_LINE` references a declared pair) while leaving it out of
 * the placings. Empty for every game with no handover.
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
    const primaryId = primaryOf(forSeat).id;
    for (const o of forSeat) {
      if (o.id !== primaryId) {
        nonPrimary.push({ occ: o, scoredId: scoredIdFor(boardAnchorId, o.id) });
      }
    }
  }
  if (nonPrimary.length === 0) return [];

  // Resolve player rows for the stand-ins.
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
