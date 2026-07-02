"use server";

import { getDb } from "@/db/games/pairs";
import { Assignment, assignments } from "@/db/games/pairs/tables/assignments";

export async function createAssignment(gameId: string, assignment: Assignment) {
  await (await getDb(gameId)).insert(assignments).values(assignment);
}
