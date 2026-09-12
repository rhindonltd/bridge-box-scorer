import "server-only";

import { getDb } from "@/db/system";
import { seatTransferCodes } from "@/db/system/schema";
import { eq } from "drizzle-orm";
import { rotateParticipantSecret } from "@/db/games/actions/rotate-participant-secret";

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

  if (!record) {
    return { valid: false, error: "Invalid code" };
  }

  if (record.used) {
    return { valid: false, error: "Code has already been used" };
  }

  if (new Date() > new Date(record.expiresAt)) {
    return { valid: false, error: "Code has expired" };
  }

  // Rotate the seat's secret so only the claiming device retains access.
  const token = crypto.randomUUID();
  const rotated = await rotateParticipantSecret(
    record.gameId,
    record.seat,
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

  return { valid: true, gameId: record.gameId, seat: record.seat, token };
}
