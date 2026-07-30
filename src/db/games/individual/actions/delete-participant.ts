"use server";

import { getDb } from "@/db/games/individual";
import { participants } from "@/db/games/individual/tables/participants";
import { players } from "@/db/games/shared/tables/players";
import { eq } from "drizzle-orm";
import { IndividualSeat } from "@/model/participants";

/**
 * Deletes an individual participant and their associated player record.
 */
export async function deleteParticipant(gameId: string, seat: IndividualSeat) {
  const db = await getDb(gameId);

  const participant = await db
    .select()
    .from(participants)
    .where(eq(participants.initialSeat, seat))
    .get();

  if (!participant) return;

  await db.delete(participants).where(eq(participants.initialSeat, seat));
  await db.delete(players).where(eq(players.id, participant.player));
}
