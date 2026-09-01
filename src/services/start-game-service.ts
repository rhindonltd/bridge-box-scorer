import "server-only";

import { Db, getDb } from "@/db/games";
import { boards } from "@/db/games/tables/boards";
import { findPairs } from "@/db/games/queries/find-pairs";
import { getSelectedMovement } from "@/db/game-index/queries/get-selected-movement";

import { PairSeat } from "@/model/participants";
import { SelectedMovement } from "@/model/selected-movement";
import { deriveExpectedSeats } from "@/model/expected-seats";
import { validateStart, StartValidationResult } from "@/model/start-validator";

import { PairMovement } from "@/db/movements/queries/get-movement";
import {
  rehydrateSelectedMovement,
  RehydratedMovement,
} from "@/services/movement-rehydration";
import {
  materializePairLikeMovement,
  MaterializableMovement,
} from "@/services/materialize-movement";
import { generateStandardMitchellWithSitOut } from "@/movement/mitchell/sit-out";
import {
  applySpecSitOutNoMissingPair,
  alignSpecMissingPair,
} from "@/movement/spec-sit-out";

/**
 * Validate the current selection + seating for a game and, when valid, produce
 * the concrete movement (with any single sit-out applied) ready to materialize.
 */
export interface ResolvedStart {
  validation: StartValidationResult;
  /** The movement to materialize, present only when validation.canStart. */
  movement: MaterializableMovement | null;
}

/**
 * Apply the appropriate sit-out transformation for a one-pair-short session.
 * Returns a MaterializableMovement with the dormant rounds flagged sitOut.
 */
function applySitOut(
  selected: SelectedMovement,
  rehydrated: RehydratedMovement,
  sitOutSeat: PairSeat,
): MaterializableMovement {
  if (selected.source === "MITCHELL") {
    if (!rehydrated.isStandardMitchell) {
      throw new Error(
        "Sit-out handling is only supported for Standard Mitchell movements.",
      );
    }
    return generateStandardMitchellWithSitOut(selected.mitchell, sitOutSeat);
  }

  // Database spec.
  if (rehydrated.missingPair !== null) {
    return alignSpecMissingPair(
      rehydrated.movement,
      rehydrated.missingPair,
      sitOutSeat,
    );
  }

  return applySpecSitOutNoMissingPair(rehydrated.movement, sitOutSeat);
}

/**
 * Resolve the movement to start for a given selection and seated seats. This is
 * the shared core used both by the read-only start-check and by the start
 * handler, so the gate and the materialization always agree.
 */
export async function resolveStart(
  selected: SelectedMovement | null,
  seatedSeats: PairSeat[],
): Promise<ResolvedStart> {
  if (selected === null) {
    return {
      validation: validateStart(null, seatedSeats),
      movement: null,
    };
  }

  const rehydrated = await rehydrateSelectedMovement(selected);

  // Derive expected seats from the movement's round-1 layout (no sit-out yet),
  // excluding any built-in phantom.
  const expected = deriveExpectedSeats(
    pairMovementToTables(rehydrated.movement),
    rehydrated.missingPair != null ? Number(rehydrated.missingPair) : null,
  );

  const validation = validateStart(expected, seatedSeats);

  if (!validation.canStart) {
    return { validation, movement: null };
  }

  const movement =
    validation.sitOutSeat !== null
      ? applySitOut(selected, rehydrated, validation.sitOutSeat)
      : toMaterializable(rehydrated.movement);

  return { validation, movement };
}

/**
 * Convert a DB PairMovement[] into the round-oriented Tables<"PAIR"> shape used
 * by deriveExpectedSeats. Only round 1 participants matter for expected seats,
 * but we map all rounds for completeness.
 */
function pairMovementToTables(movement: PairMovement[]): {
  tables: {
    table: number;
    rounds: {
      round: number;
      boards: number[];
      participants: { nsId: string; ewId: string };
    }[];
  }[];
} {
  return {
    tables: movement.map((table) => ({
      table: table.tableNumber,
      rounds: table.rounds.map((round) => ({
        round: round.roundNumber,
        boards:
          round.boardEnd >= round.boardStart
            ? rangeInclusive(round.boardStart, round.boardEnd)
            : [],
        participants: { nsId: round.ns, ewId: round.ew },
      })),
    })),
  };
}

function rangeInclusive(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

/**
 * Convert a rehydrated DB movement to a MaterializableMovement with no sit-out
 * flags (used when the movement is exactly filled).
 */
function toMaterializable(movement: PairMovement[]): MaterializableMovement {
  return movement.map((table) => ({
    tableNumber: table.tableNumber,
    rounds: table.rounds.map((round) => ({
      roundNumber: round.roundNumber,
      ns: round.ns,
      ew: round.ew,
      boardStart: round.boardStart,
      boardEnd: round.boardEnd,
    })),
  }));
}

/**
 * Read-only check of whether a game can be started. Reads the persisted
 * selection and current seating and runs the same resolution as the start
 * handler, without writing anything. Used by the start-check endpoint so the
 * UI can enable/disable the Start button and show reasons.
 */
export async function checkStart(
  gameId: string,
  db: Db,
): Promise<StartValidationResult> {
  const [selected, pairs] = await Promise.all([
    getSelectedMovement(gameId),
    findPairs(db),
  ]);

  const seatedSeats = pairs.map((p) => p.initialSeat);
  const { validation } = await resolveStart(selected, seatedSeats);
  return validation;
}

/**
 * Start a game: read its selection and seating, validate, and (only if valid)
 * materialize boards + assignments with any sit-out applied. Idempotent-guarded
 * against a game whose boards have already been materialized.
 *
 * Returns the validation result; when it cannot start, nothing is written.
 */
export async function startGame(
  gameId: string,
): Promise<StartValidationResult> {
  const db = await getDb(gameId);
  if (!db) {
    throw new Error("Game db does not exist");
  }

  // Guard against double materialization.
  const existing = await db.select({ n: boards.boardNumber }).from(boards).limit(1);
  if (existing.length > 0) {
    return {
      canStart: false,
      sitOutSeat: null,
      problems: [
        {
          code: "NO_MOVEMENT_SELECTED",
          message: "This game has already been started.",
        },
      ],
    };
  }

  const [selected, pairs] = await Promise.all([
    getSelectedMovement(gameId),
    findPairs(db),
  ]);

  const seatedSeats = pairs.map((p) => p.initialSeat);

  const { validation, movement } = await resolveStart(selected, seatedSeats);

  if (!validation.canStart || movement === null) {
    return validation;
  }

  await materializePairLikeMovement(movement, gameId);

  return validation;
}
