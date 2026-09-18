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
