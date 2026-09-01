import { Tables } from "@/model/movement";
import { PairSeat, parseSeat } from "@/model/participants";
import { MitchellMovementSpec } from "./mitchell-utils";
import { generateStandardMitchell } from "./standard-mitchell";

/**
 * Apply a single sit-out to an already-generated Standard Mitchell movement.
 *
 * A sit-out is modelled as a phantom pair occupying `sitOutSeat` in round 1.
 * The phantom's round-1 pair id is derived from the seat (e.g. `3EW`), and any
 * round where a table's NS or EW is that phantom has its boards removed so the
 * real opponent sits that round out (no boards are played there). The schedule
 * derives sit-out rounds from the absence of boards, so this is all that is
 * required downstream.
 *
 * Only Standard Mitchell (two-winner, no arrow switch) is supported. Callers
 * must ensure the spec is a standard Mitchell before calling.
 */
export function applyMitchellSitOut(
  movement: Tables<"PAIR">,
  sitOutSeat: PairSeat,
): Tables<"PAIR"> {
  const { tableNumber, direction } = parseSeat(sitOutSeat);
  const phantomId = `${tableNumber}${direction}`;

  return {
    tables: movement.tables.map((table) => ({
      table: table.table,
      rounds: table.rounds.map((round) => {
        const involvesPhantom =
          round.participants.nsId === phantomId ||
          round.participants.ewId === phantomId;

        return involvesPhantom ? { ...round, boards: [] } : round;
      }),
    })),
  };
}

/**
 * Generate a Standard Mitchell and, when a sit-out seat is supplied, apply the
 * phantom-pair sit-out transformation.
 *
 * Skip / Share-and-Relay Mitchell sit-outs are not yet supported.
 */
export function generateStandardMitchellWithSitOut(
  spec: MitchellMovementSpec,
  sitOutSeat: PairSeat | null,
): Tables<"PAIR"> {
  if (spec.skip || spec.shareAndRelay) {
    throw new Error(
      "Sit-out handling is only supported for Standard Mitchell movements.",
    );
  }

  const movement = generateStandardMitchell(spec);

  if (sitOutSeat === null) {
    return movement;
  }

  return applyMitchellSitOut(movement, sitOutSeat);
}
