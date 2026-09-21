import "server-only";

import { requireGameDb } from "@/db/games";
import { Assignment, assignments } from "@/db/games/tables/assignments";

export async function createAssignment(gameId: string, assignment: Assignment) {
  const db = await requireGameDb(gameId);

  await db.insert(assignments).values(assignment);
}
