import type { Absences } from "@/model/absence";
import type { BoardOutcome } from "@/model/score";
import type { ResultRow } from "@/model/result-row";
import type { RuledInstance } from "@/model/ruled-event";
import { applySeatSwaps } from "./seat-swap";
import { resolveAbsentRow } from "./absence";

/**
 * Board statuses that are NOT a real played line and so never belong on a
 * traveller: a Swiss bye (`SIT_OUT`) and a Swiss Pairs "2 half matches"
 * compensation block (`HALF_AVERAGE`). Both carry a phantom opponent and no
 * played result, so including them would show a stray placeholder row (and let
 * a director tap a meaningless phantom row to "override"). The real half-match
 * lines (anchor vs each opponent on their own board subset) are ordinary rows
 * and are unaffected.
 */
const NON_TRAVELLER_STATUSES = new Set(["SIT_OUT", "HALF_AVERAGE"]);

/** The board-row columns the traveller view reads. */
export type TravellerRow = Pick<
  ResultRow,
  | "roundNumber"
  | "tableNumber"
  | "boardNumber"
  | "ns"
  | "ew"
  | "confirmedResult"
  | "directorOverrideResult"
  | "status"
  | "seatsSwapped"
>;

/**
 * The traveller view of one board's rows: what each table's line shows once
 * the rulings are applied.
 *
 * - SIT_OUT and HALF_AVERAGE rows are dropped (not real played lines).
 * - A row the director marked "played the wrong way round" has its ns/ew
 *   exchanged (the result is unchanged; it is credited to the opposite pairs).
 *   Applied first so absence resolution and the caller's name lookup both work
 *   from the credited pairs.
 * - Design §11: a row missed because a pair is absent shows as it is scored —
 *   the AVE± artificial result under AVERAGE, or not at all under REMOVED (it is
 *   out of the movement).
 *
 * Two kinds of missed row: an ABSENT row (a pair withdrew or arrived late;
 * marked when it happened), and a row against a still-EMPTY expected-late seat
 * (nobody sits there yet, so it stays NOT_PLAYED and the leaderboard scores it
 * as absent on the fly). Both must read the same on the traveller as on the
 * leaderboard. Only EMPTY absences are applied to non-ABSENT rows, so every
 * other (teams / Swiss) traveller is untouched.
 *
 * The handover scored-id rewrite is deliberately NOT applied: the traveller
 * shows bare seat ids, and the caller resolves each board's names per board.
 */
export function ruledBoardInstances(
  rows: readonly TravellerRow[],
  absences: Absences,
): RuledInstance[] {
  const records = applySeatSwaps(
    rows.filter((b) => !NON_TRAVELLER_STATUSES.has(b.status ?? "")),
  );

  const emptyOnly = new Map(
    [...absences].filter(([, absence]) => absence.kind === "EMPTY"),
  );

  const shown: RuledInstance[] = [];
  for (const b of records) {
    const resolution = resolveAbsentRow(
      b,
      b.status === "ABSENT" ? absences : emptyOnly,
    );
    if (resolution?.kind === "removed") continue;
    const absentResult =
      resolution?.kind === "outcome"
        ? (resolution.outcome as BoardOutcome)
        : null;
    shown.push({
      roundNumber: b.roundNumber,
      tableNumber: b.tableNumber,
      boardNumber: b.boardNumber,
      ns: b.ns,
      ew: b.ew,
      currentResult:
        b.directorOverrideResult ?? b.confirmedResult ?? absentResult ?? null,
      status: b.status ?? null,
      seatsSwapped: b.seatsSwapped,
    });
  }
  return shown;
}
