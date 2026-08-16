"use server";

import { getDb } from "@/db/games";
import { Assignment, assignments } from "@/db/games/tables/assignments";

export async function createAssignment(gameId: string, assignment: Assignment) {
  await (await getDb(gameId)).insert(assignments).values(assignment);
}
