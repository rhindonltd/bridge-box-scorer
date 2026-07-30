"use server";

import { getDb } from "@/db/system";
import { shareCodes } from "@/db/system/schema";

/**
 * Generates a 6-character alphanumeric share code for director handoff.
 * Code expires after 5 minutes.
 */
export async function createShareCode(gameId: string): Promise<string> {
  const db = await getDb();

  const code = generateCode();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  await db.insert(shareCodes).values({
    code,
    gameId,
    expiresAt,
    used: 0,
  });

  return code;
}

function generateCode(): string {
  // 6 uppercase alphanumeric characters (no ambiguous chars: 0/O, 1/I/L)
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
