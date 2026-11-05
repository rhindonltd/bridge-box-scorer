import { Db } from "@/db/games";
import { expectedLateSeats } from "@/db/games/tables/expected-late-seats";
import { readSeatOccupancies } from "@/db/games/queries/seat-occupancy";
import { normaliseAbsenceTreatment, type Absence } from "@/model/absence";

/**
 * Every PAIRS absence in a game (design §11), keyed by board id: each withdrawn
 * or late-arrived pair (from its occupancy's standing) plus each expected-late
 * seat nobody has filled yet. Feed the result to `resolveAbsentRow`.
 *
 * A seat's absence lives on whichever of its occupancies carries the
 * WITHDRAWN / LATE standing (a withdrawal after a handover is recorded on the
 * pair playing at the time); WITHDRAWN wins if both somehow do.
 */
export async function readAbsences(db: Db): Promise<Map<string, Absence>> {
  const [occupancies, lateRows] = await Promise.all([
    readSeatOccupancies(db),
    db.select().from(expectedLateSeats),
  ]);

  const absences = new Map<string, Absence>();
  const occupiedBoardIds = new Set<string>();

  for (const occ of occupancies) {
    const boardId = occ.anchorId ?? occ.seat;
    occupiedBoardIds.add(occ.seat);
    occupiedBoardIds.add(boardId);
    if (occ.standing !== "WITHDRAWN" && occ.standing !== "LATE") continue;
    if (absences.get(boardId)?.kind === "WITHDRAWN") continue;
    absences.set(boardId, {
      kind: occ.standing,
      round: occ.withdrawnInRound ?? 1,
      treatment: normaliseAbsenceTreatment(occ.withdrawalTreatment),
    });
  }

  for (const late of lateRows) {
    // A seated seat is a LATE arrival (above), not an empty one; a stale mark
    // on an occupied seat is ignored.
    if (occupiedBoardIds.has(late.seat)) continue;
    absences.set(late.seat, {
      kind: "EMPTY",
      round: 0,
      treatment: normaliseAbsenceTreatment(late.treatment),
    });
  }

  return absences;
}
