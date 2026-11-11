import { getDb } from "@/db/games";
import {
  seatOccupancy,
  type SeatOccupancy,
} from "@/db/games/tables/seat-occupancy";
import {
  arrivalAnchorOf,
  anchorPickColumns,
} from "@/db/games/queries/seat-occupancy";
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
 * handover seat holds two rows — the arriving pair (which took over the live
 * device) and the earlier occupant it replaced. Auth resolves to the ARRIVAL
 * ANCHOR via {@link arrivalAnchorOf} — the pair whose device is live at the
 * seat. This is the DEVICE identity, deliberately NOT the ranked/scoring pick:
 * the director may mark the arriving pair "without standing" (so the earlier
 * pair is ranked), but the arriving pair still holds the device and enters
 * results, so its secret is the one that authorises the seat.
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
    .select({ ...anchorPickColumns, secretKey: seatOccupancy.secretKey })
    .from(seatOccupancy)
    .where(eq(seatOccupancy.seat, seat as PairSeat))
    .all();

  if (rows.length === 0) {
    return null;
  }

  return arrivalAnchorOf(rows).secretKey;
}

/**
 * The live device secret AND standing of the occupant at `seat` (the arrival
 * anchor, as in {@link findParticipantSecret}), or `null` when no game database
 * or occupancy exists. The standing lets a stale device tell "my seat moved to
 * another device" apart from "my pair was withdrawn" (withdrawal also rotates
 * the secret).
 */
export async function findSeatDeviceInfo(
  gameId: string,
  seat: string,
): Promise<{
  secretKey: string;
  standing: SeatOccupancy["standing"];
} | null> {
  const db = await getDb(gameId);
  if (!db) return null;
  const rows = await db
    .select({
      ...anchorPickColumns,
      secretKey: seatOccupancy.secretKey,
      standing: seatOccupancy.standing,
    })
    .from(seatOccupancy)
    .where(eq(seatOccupancy.seat, seat as PairSeat))
    .all();
  if (rows.length === 0) return null;
  const live = arrivalAnchorOf(rows);
  return { secretKey: live.secretKey, standing: live.standing };
}
