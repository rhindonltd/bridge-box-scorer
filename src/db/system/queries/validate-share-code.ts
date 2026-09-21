import "server-only";

import { getDb } from "@/db/system";
import { shareCodes } from "@/db/system/schema";
import { eq } from "drizzle-orm";
import { checkCodeValidity } from "./code-validation";

export type ValidateResult =
  { valid: true; gameId: string } | { valid: false; error: string };

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

  const rejection = checkCodeValidity(record);
  if (rejection) {
    return rejection;
  }

  // Mark as used
  await db
    .update(shareCodes)
    .set({ used: 1 })
    .where(eq(shareCodes.code, code.toUpperCase()));

  // record is defined here: checkCodeValidity rejects the not-found case above.
  return { valid: true, gameId: record!.gameId };
}
