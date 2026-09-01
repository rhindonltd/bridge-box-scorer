import { Tables } from "@/model/movement";
import { PairDirection } from "@/model/common";
import { PairSeat } from "@/model/participants";

/**
 * The seats a movement expects to be filled, derived from its round-1 layout.
 *
 * A pair movement seats one pair NS and one pair EW at every table, so the
 * expected seats are `${table}NS` / `${table}EW` for each table present in the
 * movement. When the movement declares a built-in phantom (a sit-out position),
 * that seat is reported separately in `phantomSeat` and is excluded from
 * `seats` (nobody is expected to sit there).
 */
export interface ExpectedSeats {
  seats: Set<PairSeat>;
  /** The round-1 seat occupied by the movement's phantom pair, if any. */
  phantomSeat: PairSeat | null;
}

function seatFor(table: number, direction: PairDirection): PairSeat {
  return `${table}${direction}` as PairSeat;
}

/**
 * Derive the expected seats from a movement's round-1 layout.
 *
 * @param movement  The generated / loaded movement (Tables<"PAIR">).
 * @param missingParticipant  Optional movement position id of a built-in
 *   phantom pair. When provided and matched against a round-1 position, that
 *   seat becomes `phantomSeat` and is removed from `seats`.
 */
export function deriveExpectedSeats(
  movement: Tables<"PAIR">,
  missingParticipant?: number | null,
): ExpectedSeats {
  const seats = new Set<PairSeat>();
  let phantomSeat: PairSeat | null = null;

  const phantomId =
    missingParticipant != null && missingParticipant > 0
      ? `${missingParticipant}`
      : null;

  for (const table of movement.tables) {
    const round1 = table.rounds.find((r) => r.round === 1);
    if (!round1) {
      continue;
    }

    const nsSeat = seatFor(table.table, "NS");
    const ewSeat = seatFor(table.table, "EW");

    if (phantomId !== null && round1.participants.nsId === phantomId) {
      phantomSeat = nsSeat;
    } else {
      seats.add(nsSeat);
    }

    if (phantomId !== null && round1.participants.ewId === phantomId) {
      phantomSeat = ewSeat;
    } else {
      seats.add(ewSeat);
    }
  }

  return { seats, phantomSeat };
}
