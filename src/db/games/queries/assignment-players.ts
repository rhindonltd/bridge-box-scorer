import { Db } from "@/db/games";
import { seatOccupancy } from "@/db/games/tables/seat-occupancy";
import { players } from "@/db/games/tables/players";
import type { Player } from "@/db/games/tables/players";

/** The two players seated as one pair. */
export type PairPlayers = { player1: Player; player2: Player };

/**
 * Build a map from a BOARD id (the value stored on a board row's `ns`/`ew`) to
 * the two players occupying that seat.
 *
 * A board row's `ns`/`ew` is a seat's ANCHOR id, which usually equals the
 * physical seat but can be a bare/renumbered id for one-winner movements. Each
 * occupancy records both (`seat` and `anchorId`), so this keys by the anchor id
 * (falling back to the seat when the anchor is not yet stamped — e.g. a game
 * materialised before this column existed, or a seat whose id equals the
 * anchor). In the common single-occupancy case this is one entry per seat.
 * (Resolving a specific board to the right occupant of a handover seat is a
 * later slice; this whole-seat lookup serves the player schedule and the Swiss
 * draw preview, where the single occupancy applies.)
 *
 * The name is kept (`buildAssignmentPlayerLookup`) for its existing call sites.
 */
export async function buildAssignmentPlayerLookup(
  db: Db,
): Promise<Map<string, PairPlayers>> {
  const occupancyRows = await db.select().from(seatOccupancy);
  const allPlayerRows = await db.select().from(players);

  const playerById = new Map(allPlayerRows.map((p) => [p.id, p]));

  const byBoardId = new Map<string, PairPlayers>();
  for (const o of occupancyRows) {
    const p1 = playerById.get(o.player1);
    const p2 = playerById.get(o.player2);
    if (p1 && p2) {
      byBoardId.set(o.anchorId ?? o.seat, { player1: p1, player2: p2 });
    }
  }

  return byBoardId;
}
