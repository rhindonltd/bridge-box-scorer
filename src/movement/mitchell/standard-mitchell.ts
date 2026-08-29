import {
  boardsForSet,
  getPairIds,
  MitchellMovementSpec,
  validateMitchellSpec,
  wrapValue,
} from "./mitchell-utils";

import { Table, Tables } from "../../model/movement";

export function generateStandardMitchell(
  spec: MitchellMovementSpec,
): Tables<"PAIR"> {
  const { tables, rounds, boardsPerRound, arrowSwitchRounds = 0 } = spec;

  validateMitchellSpec(spec);

  const result: Table<"PAIR">[] = [];

  for (let tableNumber = 1; tableNumber <= tables; tableNumber++) {
    const roundsList = [];

    for (let roundNumber = 1; roundNumber <= rounds; roundNumber++) {
      // Standard Mitchell:
      // EW moves one table each round.
      const ewTable = wrapValue(tableNumber - (roundNumber - 1), tables);

      // Board sets advance one set each round.
      const boardSet = wrapValue(tableNumber + roundNumber - 1, tables);

      const boards = boardsForSet(boardSet, boardsPerRound);

      // Pair numbering / arrow switch is common to
      // all Mitchell variants.
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
