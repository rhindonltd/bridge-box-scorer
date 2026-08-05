"use server";

import { getDb } from "@/db/game";
import {
  Participant,
  participants,
} from "@/db/game/tables/participants";

export async function createParticipant(gameId: string, data: Participant) {
  await (await getDb(gameId)).insert(participants).values(data);
}
