import {
  boardsForSet,
  getPairIds,
  MitchellMovementSpec,
  wrapValue,
} from "./mitchell-utils";

import { Table, Tables } from "../../model/movement";

export interface BlackpoolMovementSpec extends MitchellMovementSpec {
  blackpool: true;
  /**
   * Extra "revenge" rounds played beyond the base T rounds. In a revenge round
   * the East/West pairs and boards move on as usual, so a pair meets an
   * opponent it has already played. Defaults to 0. The reference describes at
   * most one commonly-played revenge round.
   */
  revengeRounds?: number;
}

/**
 * Blackpool movement (a.k.a. the Revenge movement).
 *
 * A two-winner Mitchell fix for an even number of tables (it also works for an
 * odd number). Unlike Share & Relay there is no board sharing: table 1 and the
 * last table keep their own boards and extra board sets sit on relay tables, so
 * the movement uses T+2 board sets over T rounds.
 *
 * Board layout is modelled as a ring of T+2 "slots": the T playing tables plus
 * two relay slots. Board sets rotate one slot per round through the whole ring,
 * so each table sees a fresh set every round and, over T rounds, sees T of the
 * T+2 sets (two sets remain unplayed by any given pair — the documented
 * two-unplayed-sets property).
 *
 * Relay placement follows the reference:
 * - Even T: one relay half way round the room and one relay between table 1 and
 *   the last table.
 * - Odd T: a double relay between the first and last table and none half way.
 *
 * The optional revenge round(s) extend the movement by continuing the normal
 * EW/board circulation; pairs then re-meet earlier opponents.
 */
export function generateBlackpool(
  spec: BlackpoolMovementSpec,
): Tables<"PAIR"> {
  const {
    tables,
    boardsPerRound,
    arrowSwitchRounds = 0,
    revengeRounds = 0,
  } = spec;

  validateBlackpoolSpec(spec);

  const boardSets = tables + 2;
  const rounds = tables + revengeRounds;

  // Ring position (0-based) of each playing table within the T+2 slot ring.
  const ringPositionOfTable = buildRingPositions(tables);

  const result: Table<"PAIR">[] = [];

  for (let tableNumber = 1; tableNumber <= tables; tableNumber++) {
    const roundsList = [];
    const ringPos = ringPositionOfTable[tableNumber];

    for (let roundNumber = 1; roundNumber <= rounds; roundNumber++) {
      // EW moves down one table each round (normal Mitchell circulation).
      const ewTable = wrapValue(tableNumber - (roundNumber - 1), tables);

      // Board set advances one slot per round through the T+2 ring.
      const boardSet = wrapValue(ringPos + roundNumber, boardSets);

      const boards = boardsForSet(boardSet, boardsPerRound);

      const { nsId, ewId } = getPairIds(
        tableNumber,
        ewTable,
        tables,
        arrowSwitchRounds,
        roundNumber,
        rounds,
      );

      roundsList.push({
        round: roundNumber,
        boards,
        participants: { nsId, ewId },
      });
    }

    result.push({ table: tableNumber, rounds: roundsList });
  }

  return { tables: result };
}

/**
 * Map each playing table (1..T) to its 0-based position in the T+2 slot ring.
 *
 * Even T: [T1..T(T/2), RELAY, T(T/2+1)..TT, RELAY]
 *   so tables 1..T/2 occupy slots 0..T/2-1 and tables T/2+1..T occupy slots
 *   T/2+1..T (one relay slot inserted half way, one relay slot at the end).
 *
 * Odd T: [T1..TT, RELAY, RELAY]
 *   so tables 1..T occupy slots 0..T-1 and the two relay slots trail at the
 *   end (a double relay between the last table and table 1).
 */
function buildRingPositions(tables: number): Record<number, number> {
  const positions: Record<number, number> = {};

  if (tables % 2 === 0) {
    const half = tables / 2;
    for (let t = 1; t <= half; t++) {
      positions[t] = t - 1;
    }
    // Slot `half` is the mid-room relay.
    for (let t = half + 1; t <= tables; t++) {
      positions[t] = t; // shifted by one to leave the relay slot at `half`
    }
    // The final slot (index tables + 1) is the second relay.
  } else {
    for (let t = 1; t <= tables; t++) {
      positions[t] = t - 1;
    }
    // Slots `tables` and `tables + 1` are the double relay.
  }

  return positions;
}

function validateBlackpoolSpec(spec: BlackpoolMovementSpec): void {
  const { tables, boardsPerRound, revengeRounds = 0 } = spec;

  if (!Number.isInteger(tables) || tables < 2) {
    throw new Error("Blackpool requires at least 2 tables");
  }

  if (!Number.isInteger(boardsPerRound) || boardsPerRound < 1) {
    throw new Error("boardsPerRound must be a positive integer");
  }

  if (!Number.isInteger(revengeRounds) || revengeRounds < 0) {
    throw new Error("revengeRounds must be a non-negative integer");
  }

  if (revengeRounds > 2) {
    throw new Error(
      "Blackpool supports at most 2 revenge rounds (one is the common maximum)",
    );
  }
}
