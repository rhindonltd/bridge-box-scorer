import { getDb } from "@/db/games";
import { participants } from "@/db/games/tables/participants";
import { PairSeat } from "@/model/participants";
import { eq } from "drizzle-orm";

/**
 * Look up the secret key issued to the participant seated at `seat` (a
 * section-qualified initial seat, e.g. "A1NS") in the given game.
 *
 * Returns the stored `secretKey`, or `null` when the game database does not
 * exist or no participant is seated there. Used by the participant-auth
 * middleware to verify that a result submission came from the seat's owner.
 */
export async function findParticipantSecret(
  gameId: string,
  seat: string,
): Promise<string | null> {
  const db = await getDb(gameId);

  if (!db) {
    return null;
  }

  const row = await db
    .select({ secretKey: participants.secretKey })
    .from(participants)
    .where(eq(participants.initialSeat, seat as PairSeat))
    .get();

  return row?.secretKey ?? null;
}
