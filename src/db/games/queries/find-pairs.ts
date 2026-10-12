import { Db } from "@/db/games";
import { players } from "@/db/games/tables/players";
import { eq, sql } from "drizzle-orm";
import { seatOccupancy } from "@/db/games/tables/seat-occupancy";
import { alias } from "drizzle-orm/sqlite-core";
import { Pair } from "@/model/participants";
import { primaryOccupancyIds } from "@/db/games/queries/seat-occupancy";

/**
 * The seated pairs of a game — one {@link Pair} per SEAT, the seat's PRIMARY
 * occupant.
 *
 * In the common case a seat has exactly one occupancy, so this is one pair per
 * seat — the stable ranked identity the leaderboard, teams derivation and
 * traveller all key on. `initialSeat` is the seat. The §2.4 lifecycle fields
 * (standing + withdrawal columns) are surfaced so the director UI can show/edit
 * a pair's standing.
 *
 * A §2.4.7 HANDOVER seat has more than one occupancy (a stand-in + the real
 * pair); only the PRIMARY occupant (the real pair — see `primaryOccupancyIds`)
 * is returned here, so every consumer of "the seated pairs" (teams derivation,
 * seat counts, the ranked participant list) sees exactly one pair per seat as
 * before. The stand-in is a scoring-only identity surfaced separately where the
 * scoring / USEBIO path needs it (it is matchpointed for its opponents but not
 * ranked), never in this list.
 */
export async function findPairs(db: Db): Promise<Pair[]> {
  const player1 = alias(players, "player1");
  const player2 = alias(players, "player2");

  const rows = await db
    .select({
      id: seatOccupancy.id,
      boards: seatOccupancy.boards,
      initialSeat: seatOccupancy.seat,
      type: sql<"PAIR">`'PAIR'`,
      player1: {
        id: player1.id,
        firstName: player1.firstName,
        lastName: player1.lastName,
        nationalId: player1.nationalId,
      },
      player2: {
        id: player2.id,
        firstName: player2.firstName,
        lastName: player2.lastName,
        nationalId: player2.nationalId,
      },
      standing: seatOccupancy.standing,
      withdrawnInRound: seatOccupancy.withdrawnInRound,
      withdrawalTreatment: seatOccupancy.withdrawalTreatment,
      withdrawalFinePercent: seatOccupancy.withdrawalFinePercent,
    })
    .from(seatOccupancy)
    .innerJoin(player1, eq(seatOccupancy.player1, player1.id))
    .innerJoin(player2, eq(seatOccupancy.player2, player2.id));

  // Keep only each seat's PRIMARY occupant. For every ordinary game (one
  // occupancy per seat) this keeps every row; only a handover seat drops its
  // non-primary stand-in here.
  const primaryIds = primaryOccupancyIds(rows);
  return rows
    .filter((r) => primaryIds.has(r.id))
    .map(({ id: _id, boards: _boards, ...pair }) => pair);
}
