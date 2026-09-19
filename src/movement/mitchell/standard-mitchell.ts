import {
  buildMitchell,
  MitchellMovementSpec,
  validateMitchellSpec,
  wrapValue,
} from "./mitchell-utils";

import { Tables } from "../../model/movement";

export function generateStandardMitchell(
  spec: MitchellMovementSpec,
): Tables {
  validateMitchellSpec(spec);

  const { tables, rounds } = spec;

  if (tables % 2 === 0) {
    throw new Error("Standard Mitchell requires an odd number of tables");
  }

  return buildMitchell(
    spec,
    { tables, rounds },
    {
      // Standard Mitchell: EW moves one table each round.
      ewTable: (tableNumber, roundNumber) =>
        wrapValue(tableNumber - (roundNumber - 1), tables),
      // Board sets advance one set each round.
      boardSet: (tableNumber, roundNumber) =>
        wrapValue(tableNumber + roundNumber - 1, tables),
    },
  );
}
