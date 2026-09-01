import "server-only";

import { Tables } from "@/model/movement";
import { SelectedMovement } from "@/model/selected-movement";
import { PairMovement, getPairMovement } from "@/db/movements/queries/get-movement";
import { getPairMovementSpecById } from "@/db/movements/queries/get-movement-spec";
import { generateStandardMitchell } from "@/movement/mitchell/standard-mitchell";

/**
 * A rehydrated movement in the DB PairMovement[] shape plus the metadata needed
 * to reason about sit-outs (its built-in missing pair, if any).
 */
export interface RehydratedMovement {
  movement: PairMovement[];
  missingPair: string | null;
  /** True when the selection is a Mitchell we support sit-outs for. */
  isStandardMitchell: boolean;
}

/**
 * Convert a generated Tables<"PAIR"> into the DB PairMovement[] shape.
 */
export function tablesToPairMovement(tables: Tables<"PAIR">): PairMovement[] {
  return tables.tables.map((table) => ({
    id: 0,
    movementId: 0,
    tableNumber: table.table,
    rounds: table.rounds.map((round) => ({
      id: 0,
      tableId: 0,
      roundNumber: round.round,
      ns: round.participants.nsId,
      ew: round.participants.ewId,
      boardStart: round.boards[0],
      boardEnd: round.boards[round.boards.length - 1],
    })),
  }));
}

/**
 * Rehydrate a persisted movement selection into the PairMovement[] shape,
 * without applying any sit-out. For a Mitchell this regenerates from the spec;
 * for a database spec this loads its rounds and metadata.
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

  const missingPair =
    spec?.missingPair != null && spec.missingPair > 0
      ? `${spec.missingPair}`
      : null;

  return { movement, missingPair, isStandardMitchell: false };
}
