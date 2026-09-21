import "server-only";

import { getDb } from "@/db/system";
import { seatTransferCodes } from "@/db/system/schema";
import { eq } from "drizzle-orm";
import { rotateParticipantSecret } from "@/db/games/actions/rotate-participant-secret";
import { checkCodeValidity } from "./code-validation";

export type ClaimSeatTransferResult =
  | { valid: true; gameId: string; seat: string; token: string }
  | { valid: false; error: string };

/**
 * Validate a seat-transfer code and, if valid, hand the seat to the claiming
 * device: rotate that seat's secret to a fresh token (invalidating the old
 * device) and mark the code used. Returns the resolved game, seat, and new
 * token so the claimer can store it and route into play.
 *
 * Rejects a missing / already-used / expired code, and a code whose seat is no
 * longer occupied (the pair left before the transfer was claimed).
 */
export async function validateAndClaimSeatTransferCode(
  code: string,
): Promise<ClaimSeatTransferResult> {
  const db = await getDb();

  const record = await db
    .select()
    .from(seatTransferCodes)
    .where(eq(seatTransferCodes.code, code.toUpperCase()))
    .get();

  const rejection = checkCodeValidity(record);
  if (rejection) {
    return rejection;
  }
  // record is defined here: checkCodeValidity rejects the not-found case above.
  const valid = record!;

  // Rotate the seat's secret so only the claiming device retains access.
  const token = crypto.randomUUID();
  const rotated = await rotateParticipantSecret(
    valid.gameId,
    valid.seat,
    token,
  );

  if (!rotated) {
    // The seat was vacated between minting and claiming the code. Consume the
    // code so a stale one can't linger.
    await db
      .update(seatTransferCodes)
      .set({ used: 1 })
      .where(eq(seatTransferCodes.code, code.toUpperCase()));
    return { valid: false, error: "That seat is no longer occupied." };
  }

  await db
    .update(seatTransferCodes)
    .set({ used: 1 })
    .where(eq(seatTransferCodes.code, code.toUpperCase()));

  return { valid: true, gameId: valid.gameId, seat: valid.seat, token };
}
