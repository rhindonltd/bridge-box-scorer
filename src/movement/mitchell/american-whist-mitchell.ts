import {
  buildMitchell,
  MitchellMovementSpec,
  validateMitchellSpec,
  wrapValue,
} from "./mitchell-utils";

import { Tables } from "../../model/movement";

export interface AmericanWhistMovementSpec extends MitchellMovementSpec {
  americanWhist: true;
}

/**
 * American Whist League (AWL) Movement.
 *
 * A Mitchell variant in which the East/West pairs move DOWN two tables each
 * round while the boards move DOWN one table. It requires an odd number of
 * tables so that the EW pairs interleave cleanly and every pair plays every
 * board exactly once over a complete movement.
 *
 * Rotation follows the published reference (bridge.fandom.com "American Whist
 * movement", 5-table example), taking round 1 as the initial (shuffle-row)
 * layout in which the EW pair and board set at table T are both T:
 *
 *   ewTable  = wrapValue(tableNumber + 2 * (roundNumber - 1), tables)
 *   boardSet = wrapValue(tableNumber + (roundNumber - 1), tables)
 *
 * NS pairs are stationary. Pair numbering (two-winner by default, one-winner
 * when arrowSwitchRounds is set) and arrow switching are handled uniformly by
 * {@link buildMitchell}, exactly as for the other table-based variants.
 */
export function generateAmericanWhistMitchell(
  spec: AmericanWhistMovementSpec,
): Tables {
  validateMitchellSpec(spec);

  const { tables, rounds } = spec;

  if (tables % 2 === 0) {
    throw new Error("American Whist requires an odd number of tables");
  }

  return buildMitchell(
    spec,
    { tables, rounds },
    {
      // EW pairs move down two tables each round: the pair now at table T
      // started 2*(round-1) tables lower in the rotation.
      ewTable: (tableNumber, roundNumber) =>
        wrapValue(tableNumber + 2 * (roundNumber - 1), tables),
      // Boards move down one table each round.
      boardSet: (tableNumber, roundNumber) =>
        wrapValue(tableNumber + (roundNumber - 1), tables),
    },
  );
}
