import { and, eq } from "drizzle-orm";
import { Db } from "@/db/games";
import { boards } from "@/db/games/tables/boards";
import { seatOccupancy } from "@/db/games/tables/seat-occupancy";
import type { PairSeat } from "@/model/participants";

/**
 * The side (NS or EW) a seat's pair plays a board from at a table: whichever
 * of the board row's `ns` / `ew` carries the pair's id. A pair keeps its
 * starting seat but need not keep its direction: in a Howell, or the second
 * stanza of a head-to-head teams match, it can sit the other way. Null when
 * the seat is empty or the pair is not at that board.
 */
export async function seatSideAtBoard(
  db: Db,
  seat: string,
  where: {
    section: string;
    roundNumber: number;
    tableNumber: number;
    boardNumber: number;
  },
): Promise<"NS" | "EW" | null> {
  const occupancy = await db
    .select({ seat: seatOccupancy.seat, anchorId: seatOccupancy.anchorId })
    .from(seatOccupancy)
    .where(eq(seatOccupancy.seat, seat as PairSeat))
    .get();
  if (occupancy == null) return null;
  const pairId = occupancy.anchorId ?? occupancy.seat;
  const row = await db
    .select({ ns: boards.ns, ew: boards.ew })
    .from(boards)
    .where(
      and(
        eq(boards.section, where.section),
        eq(boards.roundNumber, where.roundNumber),
        eq(boards.tableNumber, where.tableNumber),
        eq(boards.boardNumber, where.boardNumber),
      ),
    )
    .get();
  if (row?.ns === pairId) return "NS";
  if (row?.ew === pairId) return "EW";
  return null;
}
