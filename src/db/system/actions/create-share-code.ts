import "server-only";

import { getDb } from "@/db/system";
import { shareCodes } from "@/db/system/schema";
import { generateShortCode, CODE_TTL_MS } from "@/db/system/short-code";

/**
 * Generates a 6-character alphanumeric share code for director handoff.
 * Code expires after 5 minutes.
 */
export async function createShareCode(gameId: string): Promise<string> {
  const db = await getDb();

  const code = generateShortCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();

  await db.insert(shareCodes).values({
    code,
    gameId,
    expiresAt,
    used: 0,
  });

  return code;
}
