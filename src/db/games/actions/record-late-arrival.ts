import "server-only";

import { and, eq, isNull, lt, max, or, isNotNull } from "drizzle-orm";
import { requireGameDb } from "@/db/games";
import { boards } from "@/db/games/tables/boards";
import { expectedLateSeats } from "@/db/games/tables/expected-late-seats";
import { seatOccupancy } from "@/db/games/tables/seat-occupancy";
import { parseSeat, type PairSeat } from "@/model/participants";

export interface RecordLateArrivalResult {
  /** Whether the pair was recorded as a late arrival (it missed boards). */
  late: boolean;
  /** The round it joins at (when late). */
  arrivalRound?: number;
}

/**
 * Design §11 — a pair has just been seated, after the start, in a seat the
 * director marked "expected late".
 *
 * The pair joins at the round the room is on: the highest round in its
 * section with any result. If nothing has been scored yet it simply starts
 * from round 1 and is not late. Otherwise, in one transaction:
 *   1. its occupancy is marked LATE in that round, taking the treatment the
 *      director chose for the empty seat (unset = AVERAGE);
 *   2. its rows with no result in earlier rounds are marked ABSENT — it will
 *      not play them;
 * Either way the expected-late mark is cleared (the seat is now filled).
 */
export async function recordLateArrival(
  gameId: string,
  seat: PairSeat,
): Promise<RecordLateArrivalResult> {
  const db = await requireGameDb(gameId);

  const mark = await db
    .select()
    .from(expectedLateSeats)
    .where(eq(expectedLateSeats.seat, seat))
    .get();
  if (!mark) return { late: false };

  const { section } = parseSeat(seat);
  const latest = await db
    .select({ round: max(boards.roundNumber) })
    .from(boards)
    .where(
      and(
        eq(boards.section, section),
        or(
          isNotNull(boards.confirmedResult),
          isNotNull(boards.directorOverrideResult),
        ),
      ),
    )
    .get();
  const arrivalRound = latest?.round ?? 1;

  const occupancy = await db
    .select()
    .from(seatOccupancy)
    .where(eq(seatOccupancy.seat, seat))
    .get();
  const boardId = occupancy?.anchorId ?? seat;

  const late = arrivalRound > 1 && occupancy != null;

  db.transaction((tx) => {
    if (late) {
      tx.update(seatOccupancy)
        .set({
          standing: "LATE",
          withdrawnInRound: arrivalRound,
          withdrawalTreatment: mark.treatment ?? null,
        })
        .where(eq(seatOccupancy.id, occupancy!.id))
        .run();

      tx.update(boards)
        .set({ status: "ABSENT" })
        .where(
          and(
            or(eq(boards.ns, boardId), eq(boards.ew, boardId)),
            lt(boards.roundNumber, arrivalRound),
            isNull(boards.confirmedResult),
            isNull(boards.directorOverrideResult),
          ),
        )
        .run();
    }

    tx.delete(expectedLateSeats).where(eq(expectedLateSeats.seat, seat)).run();
  });

  return late ? { late: true, arrivalRound } : { late: false };
}
