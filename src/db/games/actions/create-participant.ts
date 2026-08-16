"use server";

import { getDb } from "@/db/games";
import {
  Participant,
  participants,
} from "@/db/games/tables/participants";

export async function createParticipant(gameId: string, data: Participant) {
  await (await getDb(gameId)).insert(participants).values(data);
}
