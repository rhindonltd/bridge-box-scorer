import "server-only";

import { requireGameDb } from "@/db/games";
import { seatOccupancy } from "@/db/games/tables/seat-occupancy";
import { PairSeat } from "@/model/participants";

/**
 * Seat a pair by writing a whole-seat `seat_occupancy` row (`boards = null` —
 * covers every board the seat plays). A thin insert helper used by tests and
 * tooling; the production seating path is {@link
 * import("./create-pair-with-players").createPairWithPlayers}, which also
 * creates the player rows in one transaction.
 */
export async function createParticipant(
  gameId: string,
  data: {
    initialSeat: PairSeat;
    player1: number;
    player2: number;
    secretKey: string;
  },
) {
  const db = await requireGameDb(gameId);

  await db.insert(seatOccupancy).values({
    seat: data.initialSeat,
    boards: null,
    player1: data.player1,
    player2: data.player2,
    secretKey: data.secretKey,
  });
}
