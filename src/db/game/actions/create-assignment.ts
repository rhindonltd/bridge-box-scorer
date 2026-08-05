"use server";

import { getDb } from "@/db/game";
import { Assignment, assignments } from "@/db/game/tables/assignments";

export async function createAssignment(gameId: string, assignment: Assignment) {
  await (await getDb(gameId)).insert(assignments).values(assignment);
}
