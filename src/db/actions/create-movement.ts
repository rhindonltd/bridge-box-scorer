"use server";

import { db } from "@/db";
import { Movement, movements } from "@/db/schema";

export async function createMovement(item: Movement) {
  await db.insert(movements).values(item);
}
