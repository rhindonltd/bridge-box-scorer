"use server";

import { getDb } from "@/db/games/individual";
import {
  Assignment,
  assignments,
} from "@/db/games/individual/tables/assignments";

export async function createAssignment(gameId: string, assignment: Assignment) {
  await (await getDb(gameId)).insert(assignments).values(assignment);
}
