import "server-only";

import { Tables } from "@/model/movement";
import { SelectedMovement } from "@/model/selected-movement";
import { getPairMovement } from "@/db/movements/queries/get-movement";
import { getPairMovementSpecById } from "@/db/movements/queries/get-movement-spec";
import { generateStandardMitchell } from "@/movement/mitchell/standard-mitchell";
import { boardRangeForSet } from "@/movement/shared";

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
}

/**
 * Convert a generated Tables<"PAIR"> into the rehydrated movement shape.
 */
export function tablesToPairMovement(
  tables: Tables<"PAIR">,
): RehydratedTable[] {
  return tables.tables.map((table) => ({
    tableNumber: table.table,
    rounds: table.rounds.map((round) => ({
      roundNumber: round.round,
      ns: round.participants.nsId,
      ew: round.participants.ewId,
      boardStart: round.boards[0],
      boardEnd: round.boards[round.boards.length - 1],
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
    const { skip, shareAndRelay } = selected.mitchell;
    const isStandardMitchell = !skip && !shareAndRelay;
    const generated = generateStandardMitchell(selected.mitchell);
    return {
      movement: tablesToPairMovement(generated),
      missingPair: null,
      isStandardMitchell,
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
    })),
  }));

  const missingPair =
    spec?.missingPair != null && spec.missingPair > 0
      ? `${spec.missingPair}`
      : null;

  return { movement: rehydrated, missingPair, isStandardMitchell: false };
}
