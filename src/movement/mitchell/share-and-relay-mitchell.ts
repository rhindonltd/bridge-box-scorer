import {
  buildMitchell,
  MitchellMovementSpec,
  validateMitchellSpec,
  wrapValue,
} from "./mitchell-utils";

import { Tables } from "../../model/movement";

export interface ShareAndRelayMovementSpec extends MitchellMovementSpec {
  shareAndRelay: true;
}

export function generateShareAndRelayMitchell(
  spec: ShareAndRelayMovementSpec,
): Tables {
  validateMitchellSpec(spec);

  const { tables, rounds } = spec;

  if (tables % 2 !== 0) {
    throw new Error(
      "Share and Relay Mitchell requires an even number of tables",
    );
  }

  if (rounds !== tables) {
    throw new Error(
      "Share and Relay Mitchell requires the number of rounds to equal the number of tables",
    );
  }

  return buildMitchell(
    spec,
    { tables, rounds },
    {
      // EW movement is the same as a normal Mitchell: EW moves down one table
      // each round.
      ewTable: (tableNumber, roundNumber) =>
        wrapValue(tableNumber - (roundNumber - 1), tables),

      /*
       * Board movement:
       *
       * The first table and last table share boards. There is a relay halfway
       * through the movement, so one board set is absent from the playing
       * tables. For round 1:
       *
       *   Table 1       -> set 1
       *   Table 2       -> set 2
       *   ...
       *   Table N/2     -> set N/2
       *   Relay         -> set N/2 + 1
       *   Table N/2+1   -> set N/2 + 2
       *   ...
       *   Table N-1     -> set N
       *   Table N       -> set 1
       *
       * Each subsequent round advances the board sets by one. The second half
       * of the room is shifted by one to leave the relay board set between the
       * two halves.
       */
      boardSet: (tableNumber, roundNumber) =>
        tableNumber <= tables / 2
          ? wrapValue(tableNumber + roundNumber - 1, tables)
          : wrapValue(tableNumber + roundNumber, tables),
    },
  );
}
