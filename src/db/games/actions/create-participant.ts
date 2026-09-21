import "server-only";

import { requireGameDb } from "@/db/games";
import { Participant, participants } from "@/db/games/tables/participants";

export async function createParticipant(gameId: string, data: Participant) {
  const db = await requireGameDb(gameId);

  await db.insert(participants).values(data);
}
