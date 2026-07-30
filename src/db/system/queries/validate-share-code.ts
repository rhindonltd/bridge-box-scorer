"use server";

import { getDb } from "@/db/system";
import { shareCodes } from "@/db/system/schema";
import { eq } from "drizzle-orm";

export type ValidateResult =
  | { valid: true; gameId: string }
  | { valid: false; error: string };

/**
 * Validates a share code and marks it as used if valid.
 * Returns the gameId if successful, or an error message.
 */
export async function validateAndClaimShareCode(
  code: string,
): Promise<ValidateResult> {
  const db = await getDb();

  const record = await db
    .select()
    .from(shareCodes)
    .where(eq(shareCodes.code, code.toUpperCase()))
    .get();

  if (!record) {
    return { valid: false, error: "Invalid code" };
  }

  if (record.used) {
    return { valid: false, error: "Code has already been used" };
  }

  const now = new Date();
  const expiresAt = new Date(record.expiresAt);

  if (now > expiresAt) {
    return { valid: false, error: "Code has expired" };
  }

  // Mark as used
  await db
    .update(shareCodes)
    .set({ used: 1 })
    .where(eq(shareCodes.code, code.toUpperCase()));

  return { valid: true, gameId: record.gameId };
}
