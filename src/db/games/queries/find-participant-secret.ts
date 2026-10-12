import { getDb } from "@/db/games";
import { seatOccupancy } from "@/db/games/tables/seat-occupancy";
import { primaryOf } from "@/db/games/queries/seat-occupancy";
import { PairSeat } from "@/model/participants";
import { eq } from "drizzle-orm";

/**
 * Look up the secret key issued to the CURRENT occupant seated at `seat` (a
 * section-qualified seat, e.g. "A1NS") in the given game.
 *
 * Returns the stored `secretKey`, or `null` when the game database does not
 * exist or no occupancy is seated there. Used by the participant-auth
 * middleware to verify that a result submission came from the seat's owner.
 *
 * A seat usually has one occupancy, so this returns its secret. A §2.4.7
 * handover seat holds two rows — the arriving real pair and the stand-in it
 * replaced (marked `WITHOUT_STANDING`). The stand-in and the real pair never
 * occupy the seat at the same instant (the handover action rotates the secret
 * and demotes the sub in one step), so auth resolves to the seat's PRIMARY
 * occupant via {@link primaryOf} — the active pair, same pick scoring uses.
 */
export async function findParticipantSecret(
  gameId: string,
  seat: string,
): Promise<string | null> {
  const db = await getDb(gameId);

  if (!db) {
    return null;
  }

  const rows = await db
    .select({
      id: seatOccupancy.id,
      boards: seatOccupancy.boards,
      standing: seatOccupancy.standing,
      secretKey: seatOccupancy.secretKey,
    })
    .from(seatOccupancy)
    .where(eq(seatOccupancy.seat, seat as PairSeat))
    .all();

  if (rows.length === 0) {
    return null;
  }

  return primaryOf(rows).secretKey;
}
