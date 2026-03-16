"use server";

import { db } from "@/db";
import { BridgeSection, sections } from "@/db/schema";

export async function createBridgeSection(item: BridgeSection) {
  await db.insert(sections).values(item);
}
