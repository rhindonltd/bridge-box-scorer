"use server";

import { getDb } from "@/db/game";
import { participants } from "@/db/game/tables/participants";
import { players } from "@/db/game/tables/players";
import { eq } from "drizzle-orm";
import { PairSeat } from "@/model/participants";

/**
 * Deletes a pair participant and their associated player records.
 */
export async function deleteParticipant(gameId: string, seat: PairSeat) {
  const db = await getDb(gameId);

  const participant = await db
    .select()
    .from(participants)
    .where(eq(participants.initialSeat, seat))
    .get();

  if (!participant) return;

  await db.delete(participants).where(eq(participants.initialSeat, seat));
  await db.delete(players).where(eq(players.id, participant.player1));
  await db.delete(players).where(eq(players.id, participant.player2));
}
