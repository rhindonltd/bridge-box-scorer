import { Tables } from "@/model/movement";
import type { MovementPlan } from "@/model/movement-plan";
import { PairSeat, SectionLetter, seatFor } from "@/model/participants";

/**
 * The seats a movement expects to be filled, derived from its round-1 layout.
 *
 * A pair movement seats one pair NS and one pair EW at every table, so the
 * expected seats are `${section}${table}NS` / `${section}${table}EW` for each
 * table present in the movement. When the movement declares a built-in phantom
 * (a sit-out position), that seat is reported separately in `phantomSeat` and
 * is excluded from `seats` (nobody is expected to sit there).
 *
 * Seats are always section-qualified: expected seats are derived per section
 * from that section's own movement.
 */
export interface ExpectedSeats {
  seats: Set<PairSeat>;
  /** The round-1 seat occupied by the movement's phantom pair, if any. */
  phantomSeat: PairSeat | null;
}

/**
 * Derive the expected seats for a single section from its movement's round-1
 * layout.
 *
 * @param section  The section these seats belong to (their seat prefix).
 * @param movement  The generated / loaded movement (Tables).
 * @param missingParticipant  Optional movement position id of a built-in
 *   phantom pair. When provided and matched against a round-1 position, that
 *   seat becomes `phantomSeat` and is removed from `seats`.
 */
export function deriveExpectedSeats(
  section: SectionLetter,
  movement: Tables,
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

    const nsSeat = seatFor(section, table.table, "NS");
    const ewSeat = seatFor(section, table.table, "EW");

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

/**
 * The seats a movement expects filled, from its round-1 layout (a plan with
 * no sit-outs), excluding any built-in phantom pair, qualified to the section.
 */
export function expectedSeatsFromLayout(
  section: SectionLetter,
  layout: MovementPlan,
  missingParticipant: number | null,
): ExpectedSeats {
  return deriveExpectedSeats(
    section,
    pairMovementToTables(layout),
    missingParticipant,
  );
}

/**
 * Convert a round-1 layout into the round-oriented Tables shape
 * used by deriveExpectedSeats. Only round 1 participants matter for expected seats,
 * but we map all rounds for completeness.
 */
function pairMovementToTables(movement: MovementPlan): {
  tables: {
    table: number;
    rounds: {
      round: number;
      boards: number[];
      participants: { nsId: string; ewId: string };
    }[];
  }[];
} {
  return {
    tables: movement.map((table) => ({
      table: table.tableNumber,
      rounds: table.rounds.map((round) => ({
        round: round.roundNumber,
        // Layout rounds always carry a valid inclusive board range (Mitchell
        // uses boardsForSet, stored specs and Swiss round 1 a set range, all
        // with a positive boardsPerRound), so boardEnd is never below boardStart;
        // the `: []` arm is defensive only.
        /* v8 ignore next 3 */
        boards:
          round.boardEnd >= round.boardStart
            ? rangeInclusive(round.boardStart, round.boardEnd)
            : [],
        participants: { nsId: round.ns, ewId: round.ew },
      })),
    })),
  };
}

function rangeInclusive(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}
