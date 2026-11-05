import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import { requireGameDb } from "@/db/games";
import { expectedLateSeats } from "@/db/games/tables/expected-late-seats";
import { seatOccupancy } from "@/db/games/tables/seat-occupancy";
import type { AbsenceTreatment } from "@/model/absence";
import type { PairSeat } from "@/model/participants";

/**
 * Design §11 — the director's choice for a late / withdrawn pair's missed
 * boards: AVERAGE (AVE−/AVE+) or REMOVED. Written on the occupancy that carries
 * the LATE / WITHDRAWN standing, or on the expected-late mark for a seat nobody
 * has filled yet. Returns false when the seat has no absence to set.
 */
export async function setAbsenceTreatment(
  gameId: string,
  seat: string,
  treatment: AbsenceTreatment,
): Promise<boolean> {
  const db = await requireGameDb(gameId);

  const updated = await db
    .update(seatOccupancy)
    .set({ withdrawalTreatment: treatment })
    .where(
      and(
        eq(seatOccupancy.seat, seat as PairSeat),
        inArray(seatOccupancy.standing, ["WITHDRAWN", "LATE"]),
      ),
    )
    .returning({ seat: seatOccupancy.seat });
  if (updated.length > 0) return true;

  const marked = await db
    .update(expectedLateSeats)
    .set({ treatment })
    .where(eq(expectedLateSeats.seat, seat as PairSeat))
    .returning({ seat: expectedLateSeats.seat });
  return marked.length > 0;
}
