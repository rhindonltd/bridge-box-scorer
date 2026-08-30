"use server";

import { getDb } from "@/db/games";
import { Assignment, assignments } from "@/db/games/tables/assignments";

export async function createAssignment(gameId: string, assignment: Assignment) {
  const db = await getDb(gameId);

  if (!db) {
    throw new Error("Game db does not exist");
  }

  await db.insert(assignments).values(assignment);
}
