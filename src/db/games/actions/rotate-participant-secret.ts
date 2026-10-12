import "server-only";

import "server-only";

import { getDb } from "@/db/games";
import { seatOccupancy } from "@/db/games/tables/seat-occupancy";
import { primaryOf } from "@/db/games/queries/seat-occupancy";
import { eq } from "drizzle-orm";
import { PairSeat } from "@/model/participants";

/**
 * Replace the secret key of the CURRENT occupant seated at `seat` with
 * `secret`.
 *
 * Used by the "change device" handoff: rotating the secret invalidates any
 * device still holding the old token, so exactly one device owns the seat after
 * a transfer. Returns true when an occupancy was updated, false when no pair is
 * seated there (e.g. it was already vacated).
 *
 * A §2.4.7 handover seat holds two rows (the arriving real pair plus the
 * `WITHOUT_STANDING` stand-in it replaced). Rotating must target only the
 * active occupant — the PRIMARY per {@link primaryOf} — so a device transfer
 * cannot clobber the other occupancy's token. The update therefore keys on the
 * resolved occupancy `id`, not the seat.
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

  const rows = await db
    .select({
      id: seatOccupancy.id,
      boards: seatOccupancy.boards,
      standing: seatOccupancy.standing,
    })
    .from(seatOccupancy)
    .where(eq(seatOccupancy.seat, seat as PairSeat))
    .all();

  if (rows.length === 0) {
    return false;
  }

  const primary = primaryOf(rows);

  const result = await db
    .update(seatOccupancy)
    .set({ secretKey: secret })
    .where(eq(seatOccupancy.id, primary.id))
    .returning({ id: seatOccupancy.id });

  return result.length > 0;
}
