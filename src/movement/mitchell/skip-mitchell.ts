import {
  buildMitchell,
  MitchellMovementSpec,
  validateMitchellSpec,
  wrapValue,
} from "./mitchell-utils";

import { Tables } from "../../model/movement";

export interface SkipMitchellMovementSpec extends MitchellMovementSpec {
  skip: true;
}

export function generateSkipMitchell(
  spec: SkipMitchellMovementSpec,
): Tables {
  validateMitchellSpec(spec);

  const { tables, rounds } = spec;

  if (tables % 2 !== 0) {
    throw new Error("Skip Mitchell requires an even number of tables");
  }

  if (rounds >= tables) {
    throw new Error("Skip Mitchell must have fewer rounds than tables");
  }

  const skipAfter = tables / 2;

  return buildMitchell(
    spec,
    { tables, rounds },
    {
      /*
       * EW movement:
       *
       * Before the skip:  0, 1, 2, 3, ...
       * After the skip:   N/2 + 1, N/2 + 2, ...
       *
       * In other words, after the halfway point we add one extra table to the
       * normal distance.
       */
      ewTable: (tableNumber, roundNumber) => {
        const ewDistance =
          roundNumber <= skipAfter ? roundNumber - 1 : roundNumber;
        return wrapValue(tableNumber - ewDistance, tables);
      },
      // Board sets advance normally, one set per round.
      boardSet: (tableNumber, roundNumber) =>
        wrapValue(tableNumber + roundNumber - 1, tables),
    },
  );
}
