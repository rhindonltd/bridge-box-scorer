import { Db } from "@/db/games";
import { seatOccupancy, SeatOccupancy } from "@/db/games/tables/seat-occupancy";
import { splitSeatSecondaryOccupants } from "@/modules/rulings";

/** Read every occupancy row in the game. */
export async function readSeatOccupancies(db: Db): Promise<SeatOccupancy[]> {
  return db.select().from(seatOccupancy);
}

/**
 * Column projection for a `.select()` that feeds the DEVICE pick
 * (`arrivalAnchorOf` in `@/modules/rulings`) — e.g. the auth /
 * secret-rotation readers. Spread it so the required flag column is never
 * forgotten:
 * `db.select({ ...anchorPickColumns, secretKey: seatOccupancy.secretKey })`.
 */
export const anchorPickColumns = {
  id: seatOccupancy.id,
  boards: seatOccupancy.boards,
  isArrivalAnchor: seatOccupancy.isArrivalAnchor,
} as const;

/**
 * Column projection for a `.select()` that feeds a RANKED / merged-line pick
 * (`rankedOf` / `mergedLineOf` / `primaryOccupancyIds` in `@/modules/rulings`).
 * Includes the device flag PLUS `standing` and `isMainLine`, so the director's
 * eligibility and main-pair choices are always honoured. Spread it into the
 * select.
 */
export const rankedPickColumns = {
  ...anchorPickColumns,
  standing: seatOccupancy.standing,
  isMainLine: seatOccupancy.isMainLine,
} as const;

/**
 * A separate (non-anchor) occupant of a SPLIT handover seat, with its
 * scored-field id and full player rows — the shape USEBIO needs to emit a
 * `<PAIR>` for it. Which occupants these are is `splitSeatSecondaryOccupants`
 * in `@/modules/rulings`. Empty for a game with no split handover.
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
  const nonPrimary = splitSeatSecondaryOccupants(occupancies);
  if (nonPrimary.length === 0) return [];

  // Resolve player rows for the non-anchor occupants.
  const { players } = await import("@/db/games/tables/players");
  const playerRows = await db.select().from(players);
  const byId = new Map(playerRows.map((p) => [p.id, p]));

  const result: NonPrimaryOccupantPair[] = [];
  for (const { occupancy: occ, scoredId } of nonPrimary) {
    const p1 = byId.get(occ.player1);
    const p2 = byId.get(occ.player2);
    if (!p1 || !p2) continue;
    result.push({ scoredId, seat: occ.seat, player1: p1, player2: p2 });
  }
  return result;
}
