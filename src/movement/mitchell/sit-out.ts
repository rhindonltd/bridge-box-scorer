import { Tables } from "@/model/movement";
import { PairSeat, parseSeat } from "@/model/participants";
import { MitchellMovementSpec } from "./mitchell-utils";
import { generateStandardMitchell } from "./standard-mitchell";
import {
  MaterializableMovement,
  MaterializableRound,
} from "@/services/materialize-movement";

/**
 * Convert a generated Tables<"PAIR"> into the MaterializableMovement shape,
 * flagging the dormant (table, round) positions as sit-outs.
 *
 * A sit-out is modelled as a phantom pair occupying `sitOutSeat` in round 1.
 * The phantom's round-1 pair id is derived from the seat (e.g. `3EW`); any
 * round where a table's NS or EW is that phantom is flagged `sitOut`, so its
 * boards are materialized with status SIT_OUT (not played there that round)
 * while keeping the real board numbers and table for the sitting-out pair.
 */
export function applyMitchellSitOut(
  movement: Tables<"PAIR">,
  sitOutSeat: PairSeat | null,
): MaterializableMovement {
  const phantomId =
    sitOutSeat === null ? null : seatToPhantomId(sitOutSeat);

  return movement.tables.map((table) => ({
    tableNumber: table.table,
    rounds: table.rounds.map((round): MaterializableRound => {
      const involvesPhantom =
        phantomId !== null &&
        (round.participants.nsId === phantomId ||
          round.participants.ewId === phantomId);

      return {
        roundNumber: round.round,
        ns: round.participants.nsId,
        ew: round.participants.ewId,
        boardStart: round.boards[0],
        boardEnd: round.boards[round.boards.length - 1],
        ...(involvesPhantom ? { sitOut: true } : {}),
      };
    }),
  }));
}

function seatToPhantomId(sitOutSeat: PairSeat): string {
  const { tableNumber, direction } = parseSeat(sitOutSeat);
  return `${tableNumber}${direction}`;
}

/**
 * Generate a Standard Mitchell and, when a sit-out seat is supplied, flag the
 * dormant positions so materialization writes them as SIT_OUT.
 *
 * Skip / Share-and-Relay Mitchell sit-outs are not yet supported.
 */
export function generateStandardMitchellWithSitOut(
  spec: MitchellMovementSpec,
  sitOutSeat: PairSeat | null,
): MaterializableMovement {
  if (spec.skip || spec.shareAndRelay) {
    throw new Error(
      "Sit-out handling is only supported for Standard Mitchell movements.",
    );
  }

  return applyMitchellSitOut(generateStandardMitchell(spec), sitOutSeat);
}
