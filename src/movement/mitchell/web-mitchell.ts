import {
  boardsForSet,
  getPairIds,
  MitchellMovementSpec,
  validateMitchellSpec,
  wrapValue,
} from "./mitchell-utils";

import { Table, Tables } from "../../model/movement";

export interface WebMitchellMovementSpec extends MitchellMovementSpec {
  web: true;
}

/**
 * Web Mitchell.
 *
 * A Web Mitchell keeps the whole field comparing the same board sets by using
 * duplicate copies of each set: many tables play the same set number at once,
 * so a session that would otherwise split into disjoint Mitchell halves stays
 * a single comparison. There are exactly `rounds` distinct board sets (not
 * `tables`), and every pair plays each of those sets at most once.
 *
 * This construction was reverse-engineered from published bridgecentral.com
 * Web Mitchell layouts and reproduces them exactly. There are two shapes:
 *
 *   - Even table counts split into two equal halves (H = tables / 2). NS pairs
 *     are stationary; EW pairs move up one table per round with a single extra
 *     "skip" at the half-way point for even round counts (the classic Skip
 *     Mitchell move), which keeps the twin board sets replay-free. Board sets
 *     ascend across the first half of the tables and descend across the second.
 *
 *   - Odd table counts use a "rainbow" set assignment: NS stationary, EW up one
 *     table per round, and each EW pair plays `rounds` distinct set numbers
 *     across the session, so no pair ever replays a board while every set is in
 *     play every round.
 *
 * The duplicate-copy label (A/B/C/D) records which physical copy of a board
 * set a table plays: because many tables play the same set number at once, the
 * copy is what distinguishes those otherwise-identical instances. It is emitted
 * per (table, round) as `boardCopy` and persisted at materialization.
 */
export function generateWebMitchell(
  spec: WebMitchellMovementSpec,
): Tables<"PAIR"> {
  return spec.tables % 2 === 0
    ? generateWebMitchellEven(spec)
    : generateWebMitchellOdd(spec);
}

/**
 * How far the EW pairs have advanced (in tables) by the start of `round`,
 * expressed as a standard Mitchell "skip" progression:
 *
 *   - EW move up one table each round (displacement round - 1), AND
 *   - for an even round count, take one extra skip at the half-way point
 *     (after round rounds / 2). This is the classic even-table Skip Mitchell
 *     move and is what keeps the twin board sets replay-free.
 *   - for an odd round count no skip is needed.
 */
function ewDistance(round: number, rounds: number): number {
  const skipAfter = rounds / 2;
  const extraSkip = rounds % 2 === 0 && round > skipAfter ? 1 : 0;

  return round - 1 + extraSkip;
}

function generateWebMitchellEven(
  spec: WebMitchellMovementSpec,
): Tables<"PAIR"> {
  const { tables, rounds, boardsPerRound, arrowSwitchRounds = 0 } = spec;

  validateMitchellSpec(spec);

  if (tables % 2 !== 0) {
    throw new Error("generateWebMitchellEven requires an even table count");
  }

  const half = tables / 2;

  const result: Table<"PAIR">[] = [];

  for (let tableNumber = 1; tableNumber <= tables; tableNumber++) {
    const roundsList = [];

    const inFirstHalf = tableNumber <= half;

    // The two halves play the same board sets on different physical copies:
    // the first half on copy A, the second on copy B.
    const boardCopy = inFirstHalf ? "A" : "B";

    for (let roundNumber = 1; roundNumber <= rounds; roundNumber++) {
      // NS stationary; EW move up one table per round, with a half-way skip.
      const ewTable = wrapValue(
        tableNumber - ewDistance(roundNumber, rounds),
        tables,
      );

      /*
       * There are `rounds` distinct board sets. Sets ascend across the first
       * half of the tables and descend, mirrored, across the second half, so
       * the two halves share the same sets (played on duplicate copies).
       */
      const boardSet = inFirstHalf
        ? wrapValue(tableNumber + (roundNumber - 1), rounds)
        : wrapValue(
            wrapValue(half - (tableNumber - half), rounds) - (roundNumber - 1),
            rounds,
          );

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
        boardCopy,
        participants: {
          nsId,
          ewId,
        },
      });
    }

    result.push({
      table: tableNumber,
      rounds: roundsList,
    });
  }

  return { tables: result };
}

/** Physical-copy labels, assigned by band for the odd-table Web. */
const COPY_LABELS = ["A", "B", "C", "D"];

function generateWebMitchellOdd(
  spec: WebMitchellMovementSpec,
): Tables<"PAIR"> {
  const { tables, rounds, boardsPerRound, arrowSwitchRounds = 0 } = spec;

  validateMitchellSpec(spec);

  if (tables % 2 === 0) {
    throw new Error("generateWebMitchellOdd requires an odd table count");
  }

  const result: Table<"PAIR">[] = [];

  for (let tableNumber = 1; tableNumber <= tables; tableNumber++) {
    const roundsList = [];

    // Copies are assigned by band (tables 1..rounds = A, next rounds = B, ...)
    // so the simultaneous plays of a set number use different physical decks.
    const boardCopy = COPY_LABELS[Math.floor((tableNumber - 1) / rounds)] ?? "A";

    for (let roundNumber = 1; roundNumber <= rounds; roundNumber++) {
      // NS stationary; EW move up one table per round.
      const ewTable = wrapValue(tableNumber - (roundNumber - 1), tables);

      /*
       * "Rainbow" set assignment: each EW pair plays `rounds` distinct set
       * numbers across the session, so no pair ever replays a board while
       * every set is in play every round.
       */
      const tableOffset = (((tableNumber - roundNumber) % tables) + tables) % tables;
      const boardSet = ((roundNumber - 1 + tableOffset) % rounds) + 1;

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
        boardCopy,
        participants: {
          nsId,
          ewId,
        },
      });
    }

    result.push({
      table: tableNumber,
      rounds: roundsList,
    });
  }

  return { tables: result };
}
