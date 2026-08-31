"use server";

import { getDb } from "@/db/games";
import { Participant, participants } from "@/db/games/tables/participants";

export async function createParticipant(gameId: string, data: Participant) {
  const db = await getDb(gameId);

  if (!db) {
    throw new Error("Game db does not exist");
  }

  await db.insert(participants).values(data);
}
