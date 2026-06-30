"use server";

import { getDb } from "@/db/games/individual";
import {
  Participant,
  participants,
} from "@/db/games/individual/tables/participants";

export async function findParticipants(gameId: string): Promise<Participant[]> {
  return (await getDb(gameId)).select().from(participants);
}
