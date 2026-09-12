import "server-only";

import { getDb } from "@/db/games";
import { participants } from "@/db/games/tables/participants";
import { eq } from "drizzle-orm";
import { PairSeat } from "@/model/participants";

/**
 * Replace the secret key of the participant seated at `seat` with `secret`.
 *
 * Used by the "change device" handoff: rotating the secret invalidates any
 * device still holding the old token, so exactly one device owns the seat after
 * a transfer. Returns true when a participant row was updated, false when no
 * pair is seated there (e.g. it was already vacated).
 */
export async function rotateParticipantSecret(
  gameId: string,
  seat: string,
  secret: string,
): Promise<boolean> {
  const db = await getDb(gameId);

  if (!db) {
    return false;
  }

  const result = await db
    .update(participants)
    .set({ secretKey: secret })
    .where(eq(participants.initialSeat, seat as PairSeat))
    .returning({ initialSeat: participants.initialSeat });

  return result.length > 0;
}
