import { Db } from "@/db/games";
import { boards } from "@/db/games/tables/boards";
import { players } from "@/db/games/tables/players";
import { readSeatOccupancies } from "@/db/games/queries/seat-occupancy";
import { readAbsences } from "@/db/games/queries/absences";
import { isAbsentRow, type AbsenceTreatment } from "@/model/absence";

/**
 * One late, withdrawn or still-missing pair for the director's combined
 * "Late Arrivals / Withdrawals / Substitutions" screen (design §11).
 */
export interface AbsentPair {
  /** The physical seat (section-qualified, e.g. "A3EW"). */
  seat: string;
  /**
   * LATE — arrived after the start; WITHDRAWN — withdrew part-way; EMPTY — an
   * expected-late seat nobody has filled yet.
   */
  kind: "LATE" | "WITHDRAWN" | "EMPTY";
  /** "First Last & First Last", or null for an empty seat. */
  pair: string | null;
  /** LATE: the arrival round. WITHDRAWN: the round it withdrew in. EMPTY: null. */
  round: number | null;
  /** The director's choice for the boards it misses (unset = AVERAGE). */
  treatment: AbsenceTreatment;
  /** How many boards it misses (so far, for an empty seat). */
  missedBoards: number;
}

/** Every absence in a PAIRS game, late arrivals first, then by seat. */
export async function findAbsentPairs(db: Db): Promise<AbsentPair[]> {
  const absences = await readAbsences(db);
  if (absences.size === 0) return [];

  const [occupancies, playerRows, boardRows] = await Promise.all([
    readSeatOccupancies(db),
    db.select().from(players),
    db
      .select({
        ns: boards.ns,
        ew: boards.ew,
        roundNumber: boards.roundNumber,
        confirmedResult: boards.confirmedResult,
        directorOverrideResult: boards.directorOverrideResult,
      })
      .from(boards),
  ]);
  const playerById = new Map(playerRows.map((p) => [p.id, p]));
  const name = (id: number) => {
    const p = playerById.get(id);
    return p ? `${p.firstName} ${p.lastName}`.trim() : "";
  };

  const kindOrder = { LATE: 0, WITHDRAWN: 1, EMPTY: 2 } as const;
  const result: AbsentPair[] = [];

  for (const [boardId, absence] of absences) {
    // The pair is the occupancy carrying the absence standing.
    const occ = occupancies.find(
      (o) => (o.anchorId ?? o.seat) === boardId && o.standing === absence.kind,
    );
    // Count the rows this absence covers, on this seat's own rows only.
    const onlyThis = new Map([[boardId, absence]]);
    const missedBoards = boardRows.filter(
      (r) => (r.ns === boardId || r.ew === boardId) && isAbsentRow(r, onlyThis),
    ).length;

    result.push({
      seat: occ?.seat ?? boardId,
      kind: absence.kind,
      pair: occ ? `${name(occ.player1)} & ${name(occ.player2)}` : null,
      round: absence.kind === "EMPTY" ? null : absence.round,
      treatment: absence.treatment,
      missedBoards,
    });
  }

  return result.sort(
    (a, b) =>
      kindOrder[a.kind] - kindOrder[b.kind] || a.seat.localeCompare(b.seat),
  );
}
