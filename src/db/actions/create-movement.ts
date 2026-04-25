"use server";

import { getDb } from "@/db";
import {
  IndividualMovement,
  individualMovements,
  PairMovement,
  pairMovements,
} from "@/db/schema";

export async function createIndividualMovement(item: IndividualMovement) {
  const db = await getDb();
  await db.insert(individualMovements).values(item);
}

export async function createPairMovement(item: PairMovement) {
  const db = await getDb();
  await db.insert(pairMovements).values(item);
}
