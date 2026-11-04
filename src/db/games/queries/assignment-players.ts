import { Db } from "@/db/games";
import { seatOccupancy } from "@/db/games/tables/seat-occupancy";
import { players } from "@/db/games/tables/players";
import type { Player } from "@/db/games/tables/players";
import { occupancyCoversBoard } from "@/db/games/queries/seat-occupancy";

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

/**
 * Resolve the two players occupying a BOARD id FOR A SPECIFIC BOARD NUMBER —
 * the per-board counterpart to {@link buildAssignmentPlayerLookup}.
 *
 * Returns a function `(boardId, boardNumber) -> PairPlayers | null`. For an
 * ordinary seat (one occupancy, `boards = null`) it returns that pair for every
 * board, exactly like the whole-seat lookup. For a §2.4.7 HANDOVER seat (two
 * occupancies over disjoint board sets) it returns the occupant whose `boards`
 * set CONTAINS the requested board — so the stand-in's played boards resolve to
 * the stand-in's names and the real pair's boards to the real pair's names,
 * rather than one pair winning the whole seat (the anchor-keyed map's
 * last-writer-wins collision).
 *
 * The traveller uses this so each board row shows whoever actually held that
 * board. Keyed by the board id (anchor) just like the board rows' `ns`/`ew`.
 */
export async function buildPerBoardPlayerLookup(
  db: Db,
): Promise<(boardId: string, boardNumber: number) => PairPlayers | null> {
  const occupancyRows = await db.select().from(seatOccupancy);
  const allPlayerRows = await db.select().from(players);
  const playerById = new Map(allPlayerRows.map((p) => [p.id, p]));

  // Group every occupancy by its board id (anchorId ?? seat), so a handover
  // seat's two rows sit together under one key.
  const bySeatBoardId = new Map<
    string,
    { boards: number[] | null; player1: Player; player2: Player }[]
  >();
  for (const o of occupancyRows) {
    const p1 = playerById.get(o.player1);
    const p2 = playerById.get(o.player2);
    if (!p1 || !p2) continue;
    const key = o.anchorId ?? o.seat;
    const arr = bySeatBoardId.get(key) ?? [];
    arr.push({ boards: o.boards, player1: p1, player2: p2 });
    bySeatBoardId.set(key, arr);
  }

  return (boardId, boardNumber) => {
    const forSeat = bySeatBoardId.get(boardId);
    if (!forSeat || forSeat.length === 0) return null;
    // Single occupancy (every ordinary seat): it holds every board.
    if (forSeat.length === 1) {
      const { player1, player2 } = forSeat[0];
      return { player1, player2 };
    }
    // Handover seat: the occupant whose board set contains this board, falling
    // back to a whole-seat (boards = null) occupant if one is present.
    const occupant =
      forSeat.find((o) => occupancyCoversBoard(o, boardNumber)) ??
      forSeat.find((o) => o.boards == null);
    if (!occupant) return null;
    return { player1: occupant.player1, player2: occupant.player2 };
  };
}

