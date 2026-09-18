import "server-only";

import { Tables } from "@/model/movement";
import { SelectedMovement } from "@/model/selected-movement";
import { getPairMovement } from "@/db/movements/queries/get-movement";
import { getPairMovementSpecById } from "@/db/movements/queries/get-movement-spec";
import { generateMitchell } from "@/movement/mitchell/mitchell";
import { boardRangeForSet } from "@/movement/shared";
import { swissRoundOne } from "@/movement/swiss/swiss-pairing";
import { swissRoundBoardRange } from "@/services/materialize-swiss-round";

/**
 * A single round of a rehydrated movement, carrying concrete board numbers.
 *
 * Stored specs keep only a board-set index; rehydration expands that into a
 * `boardStart`/`boardEnd` range using the boards-per-round chosen for the
 * selection, so all downstream consumers (materialization, sit-out handling)
 * see real board numbers.
 */
export interface RehydratedRound {
  roundNumber: number;
  ns: string;
  ew: string;
  boardStart: number;
  boardEnd: number;
  /**
   * The physical duplicate copy of the board set played this round. Only Web
   * Mitchell movements use more than one copy; every other movement (including
   * seeded specs) plays a single copy, so this defaults to "A".
   */
  boardCopy: string;
}

export interface RehydratedTable {
  tableNumber: number;
  rounds: RehydratedRound[];
}

/**
 * A rehydrated movement plus the metadata needed to reason about sit-outs (its
 * built-in missing pair, if any).
 */
export interface RehydratedMovement {
  movement: RehydratedTable[];
  missingPair: string | null;
  /** True when the selection is a Mitchell we support sit-outs for. */
  isStandardMitchell: boolean;
  /**
   * True for a Swiss selection. Swiss only ever rehydrates its round 1 (a
   * positional layout); later rounds are drawn live, never rehydrated. The
   * start pipeline uses this to route materialization through the incremental
   * Swiss path and to apply Swiss's own (bye) sit-out rather than the
   * Mitchell/spec sit-out helpers.
   */
  isSwiss: boolean;
  /**
   * True for a Swiss Teams selection. Like Swiss it only ever rehydrates round
   * 1's seat layout (every table filled NS + EW); the actual random team
   * pairing and open/closed-room expansion happen in the Swiss Teams start
   * path, not here. The start pipeline uses this to route materialization
   * through the Swiss Teams path.
   */
  isSwissTeams: boolean;
  /**
   * True for a Teams Round Robin selection. Like Swiss Teams it rehydrates only
   * round 1's positional seat layout here (enough for expected-seat
   * derivation); unlike Swiss Teams the whole fixed schedule is generated and
   * materialized at start (no live draw). The start pipeline uses this to route
   * through the round-robin resolver, which shares Swiss Teams' structural
   * validations (full team per table, even team count).
   */
  isRoundRobinTeams: boolean;
}

/**
 * Convert a generated Tables into the rehydrated movement shape.
 */
export function tablesToPairMovement(
  tables: Tables,
): RehydratedTable[] {
  return tables.tables.map((table) => ({
    tableNumber: table.table,
    rounds: table.rounds.map((round) => ({
      roundNumber: round.round,
      ns: round.participants.nsId,
      ew: round.participants.ewId,
      boardStart: round.boards[0],
      boardEnd: round.boards[round.boards.length - 1],
      boardCopy: round.boardCopy ?? "A",
    })),
  }));
}

/**
 * Rehydrate a persisted movement selection, without applying any sit-out. For a
 * Mitchell this regenerates from the spec; for a database spec this loads its
 * rounds and metadata and expands each round's board-set index into concrete
 * board numbers using the selection's chosen boards-per-round.
 */
export async function rehydrateSelectedMovement(
  selected: SelectedMovement,
): Promise<RehydratedMovement> {
  if (selected.source === "MITCHELL") {
    const { skip, shareAndRelay, hesitation, web } = selected.mitchell;
    // Only a plain Standard Mitchell (no variant flag) supports the sit-out
    // handling applied downstream; the variants build differently.
    const isStandardMitchell = !skip && !shareAndRelay && !hesitation && !web;
    // Dispatch through generateMitchell so every variant flag (skip,
    // shareAndRelay, hesitation, web) is honoured, not just Standard.
    const generated = generateMitchell(selected.mitchell);
    return {
      movement: tablesToPairMovement(generated),
      missingPair: null,
      isStandardMitchell,
      isSwiss: false,
      isSwissTeams: false,
      isRoundRobinTeams: false,
    };
  }

  if (selected.source === "SWISS") {
    // Swiss rehydrates only round 1: a positional layout (table T seats pair T
    // NS vs pair tables+T EW). Later rounds are drawn live and never rehydrated.
    const { tables, boardsPerRound } = selected.swiss;
    const { boardStart, boardEnd } = swissRoundBoardRange(1, boardsPerRound);
    const movement: RehydratedTable[] = swissRoundOne(tables).map((seat) => ({
      tableNumber: seat.tableNumber,
      rounds: [
        {
          roundNumber: 1,
          // A pair's participant id is its round-1 home seat (unqualified,
          // e.g. "1NS"); buildSectionRows prefixes the section later. Round 1
          // is positional so table T is exactly pair T (NS) vs pair tables+T
          // (EW), i.e. seats "${T}NS" and "${T}EW".
          ns: `${seat.tableNumber}NS`,
          ew: `${seat.tableNumber}EW`,
          boardStart,
          boardEnd,
          boardCopy: "A",
        },
      ],
    }));
    return {
      movement,
      missingPair: null,
      isStandardMitchell: false,
      isSwiss: true,
      isSwissTeams: false,
      isRoundRobinTeams: false,
    };
  }

  if (selected.source === "SWISS_TEAMS") {
    // Swiss Teams rehydrates only round 1's seat layout: every table is filled
    // NS + EW (positional, table T = pair T NS vs pair teams+T EW). This is
    // enough for expected-seat derivation; the real random team pairing and
    // open/closed-room expansion happen in the Swiss Teams start path.
    const { teams, boardsPerRound } = selected.swissTeams;
    const { boardStart, boardEnd } = swissRoundBoardRange(1, boardsPerRound);
    const movement: RehydratedTable[] = swissRoundOne(teams).map((seat) => ({
      tableNumber: seat.tableNumber,
      rounds: [
        {
          roundNumber: 1,
          ns: `${seat.tableNumber}NS`,
          ew: `${seat.tableNumber}EW`,
          boardStart,
          boardEnd,
          boardCopy: "A",
        },
      ],
    }));
    return {
      movement,
      missingPair: null,
      isStandardMitchell: false,
      isSwiss: false,
      isSwissTeams: true,
      isRoundRobinTeams: false,
    };
  }

  if (selected.source === "ROUND_ROBIN_TEAMS") {
    // Teams Round Robin rehydrates only round 1's positional seat layout (every
    // table filled NS + EW), which is all the expected-seat derivation needs.
    // The full fixed schedule is generated and materialized at start by the
    // round-robin resolver — this stays a lightweight round-1 layout.
    const { teams, boardsPerRound } = selected.roundRobinTeams;
    const { boardStart, boardEnd } = swissRoundBoardRange(1, boardsPerRound);
    const movement: RehydratedTable[] = swissRoundOne(teams).map((seat) => ({
      tableNumber: seat.tableNumber,
      rounds: [
        {
          roundNumber: 1,
          ns: `${seat.tableNumber}NS`,
          ew: `${seat.tableNumber}EW`,
          boardStart,
          boardEnd,
          boardCopy: "A",
        },
      ],
    }));
    return {
      movement,
      missingPair: null,
      isStandardMitchell: false,
      isSwiss: false,
      isSwissTeams: false,
      isRoundRobinTeams: true,
    };
  }

  const [movement, spec] = await Promise.all([
    getPairMovement(selected.specId),
    getPairMovementSpecById(selected.specId),
  ]);

  const rehydrated: RehydratedTable[] = movement.map((table) => ({
    tableNumber: table.tableNumber,
    rounds: table.rounds.map((round) => ({
      roundNumber: round.roundNumber,
      ns: round.ns,
      ew: round.ew,
      ...boardRangeForSet(round.boardSet, selected.boardsPerRound),
      // Seeded specs are single-copy; Web logistics for those live in the
      // seeded data itself, not as a distinct copy label here.
      boardCopy: "A",
    })),
  }));

  const missingPair =
    spec?.missingPair != null && spec.missingPair > 0
      ? `${spec.missingPair}`
      : null;

  return {
    movement: rehydrated,
    missingPair,
    isStandardMitchell: false,
    isSwiss: false,
    isSwissTeams: false,
    isRoundRobinTeams: false,
  };
}
