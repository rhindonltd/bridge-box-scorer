import "server-only";

import { requireGameDb } from "@/db/games";
import { seatOccupancy } from "@/db/games/tables/seat-occupancy";
import { players } from "@/db/games/tables/players";
import { eq } from "drizzle-orm";
import { PairSeat } from "@/model/participants";

/**
 * Deletes a seated pair (its `seat_occupancy` row) and its two player records.
 *
 * Used pre-start to vacate a seat. In the single-occupancy setup phase a seat
 * has exactly one occupancy, so this removes it and the two players it named.
 */
export async function deleteParticipant(gameId: string, seat: PairSeat) {
  const db = await requireGameDb(gameId);

  const occupancy = await db
    .select()
    .from(seatOccupancy)
    .where(eq(seatOccupancy.seat, seat))
    .get();

  if (!occupancy) return;

  await db.delete(seatOccupancy).where(eq(seatOccupancy.seat, seat));
  await db.delete(players).where(eq(players.id, occupancy.player1));
  await db.delete(players).where(eq(players.id, occupancy.player2));
}
