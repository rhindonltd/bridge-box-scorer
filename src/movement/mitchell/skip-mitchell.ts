import {
  boardsForSet,
  getPairIds,
  MitchellMovementSpec,
  validateMitchellSpec,
  wrapValue,
} from "./mitchell-utils";

import { Table, Tables } from "../../model/movement";

export interface SkipMitchellMovementSpec extends MitchellMovementSpec {
  skip: true;
}

export function generateSkipMitchell(
  spec: SkipMitchellMovementSpec,
): Tables<"PAIR"> {
  const { tables, rounds, boardsPerRound, arrowSwitchRounds = 0 } = spec;

  validateMitchellSpec(spec);

  if (tables % 2 !== 0) {
    throw new Error("Skip Mitchell requires an even number of tables");
  }

  if (rounds >= tables) {
    throw new Error("Skip Mitchell must have fewer rounds than tables");
  }

  const skipAfter = tables / 2;

  const result: Table<"PAIR">[] = [];

  for (let tableNumber = 1; tableNumber <= tables; tableNumber++) {
    const roundsList = [];

    for (let roundNumber = 1; roundNumber <= rounds; roundNumber++) {
      /*
       * EW movement:
       *
       * Before the skip:
       *   0, 1, 2, 3, ...
       *
       * After the skip:
       *   N/2 + 1, N/2 + 2, ...
       *
       * In other words, after the halfway point we
       * add one extra table to the normal distance.
       */
      const ewDistance =
        roundNumber <= skipAfter ? roundNumber - 1 : roundNumber;

      const ewTable = wrapValue(tableNumber - ewDistance, tables);

      /*
       * Board sets advance normally, one set per round.
       */
      const boardSet = wrapValue(tableNumber + roundNumber - 1, tables);

      const boards = boardsForSet(boardSet, boardsPerRound);

      /*
       * Pair numbering and arrow switching are shared
       * by all Mitchell movements.
       */
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
