import { Db } from "@/db/games";
import { expectedLateSeats } from "@/db/games/tables/expected-late-seats";
import { eq } from "drizzle-orm";
import { PairSeat } from "@/model/participants";

/**
 * The set of EMPTY seats marked "expected late" (§2.4.7) for a game — the seats
 * a director declared will be filled by a latecomer, letting the game start
 * short. Returned as a Set for cheap membership checks at start-validation and
 * scoring time.
 */
export async function readExpectedLateSeats(db: Db): Promise<Set<string>> {
  const rows = await db
    .select({ seat: expectedLateSeats.seat })
    .from(expectedLateSeats);
  return new Set(rows.map((r) => r.seat));
}

/** Mark a seat as expected-late (idempotent). */
export async function addExpectedLateSeat(
  db: Db,
  seat: PairSeat,
): Promise<void> {
  await db
    .insert(expectedLateSeats)
    .values({ seat })
    .onConflictDoNothing();
}

/**
 * Clear a seat's expected-late mark. Called when the latecomer is finally
 * seated, or when the director removes the mark (reverting to a plain
 * empty/sit-out seat).
 */
export async function removeExpectedLateSeat(
  db: Db,
  seat: PairSeat,
): Promise<void> {
  await db.delete(expectedLateSeats).where(eq(expectedLateSeats.seat, seat));
}
