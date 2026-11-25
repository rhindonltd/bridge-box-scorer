import { Db } from "@/db/games";
import { seatOccupancy, SeatOccupancy } from "@/db/games/tables/seat-occupancy";
import { scoredIdFor } from "@/model/participants";
import {
  arrivalAnchorOf,
  mergedLineOf,
  seatIsOneLine,
  type RankedCandidate,
} from "@/modules/rulings";

/** Read every occupancy row in the game. */
export async function readSeatOccupancies(db: Db): Promise<SeatOccupancy[]> {
  return db.select().from(seatOccupancy);
}

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
    /* v8 ignore next -- unreachable: the seat has 2+ occupancies, so one differs from the main */
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
  player1: {
    id: number;
    firstName: string;
    lastName: string;
    nationalId: string | null;
  };
  player2: {
    id: number;
    firstName: string;
    lastName: string;
    nationalId: string | null;
  };
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
