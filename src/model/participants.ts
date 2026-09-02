import { NewPlayer, Player } from "@/db/games/tables/players";
import { PairDirection } from "@/model/common";

export interface ParticipantsByMode {
  PAIR: {
    nsId: string;
    ewId: string;
  };
}

export type TravellerParticipantMode = "PAIR";

/* ---------- seat ---------- */

/**
 * A section is identified by a single uppercase letter (A, B, C, ...). Table
 * numbers restart within each section, so a seat is only unique when qualified
 * by its section.
 */
export type SectionLetter = string;

/**
 * A section-qualified pair seat: `${section}${table}${direction}`, e.g.
 * "A3NS". Every seat in the system carries its section prefix; there is no
 * unprefixed form.
 */
export type SectionedSeat = `${SectionLetter}${number}${PairDirection}`;

// Retained name for the pair seat type; now always section-qualified.
export type PairSeat = SectionedSeat;

export type Seat = PairSeat;

const SEAT_REGEX = /^([A-Z]+)(\d+)(NS|EW)$/;

export function isPairSeat(seat: Seat): seat is PairSeat {
  return SEAT_REGEX.test(seat);
}

/**
 * Decode a section-qualified seat into its parts.
 *
 * @throws if the seat is not a valid section-qualified seat (e.g. an
 *   unprefixed "3NS"); all seats in the system are expected to be qualified.
 */
export function parseSeat(seat: Seat): {
  section: SectionLetter;
  tableNumber: number;
  direction: PairDirection;
} {
  const match = SEAT_REGEX.exec(seat);
  if (!match) {
    throw new Error(`Invalid seat: ${seat}`);
  }

  const [, section, table, direction] = match;
  return {
    section,
    tableNumber: Number(table),
    direction: direction as PairDirection,
  };
}

/**
 * Build a section-qualified seat from its parts.
 */
export function seatFor(
  section: SectionLetter,
  tableNumber: number,
  direction: PairDirection,
): PairSeat {
  return `${section}${tableNumber}${direction}` as PairSeat;
}

/* ---------- participants ---------- */

export type NewPair = {
  type: "PAIR";
  initialSeat: PairSeat;
  player1: NewPlayer;
  player2: NewPlayer;
};

export type Pair = {
  type: "PAIR";
  initialSeat: PairSeat;
  player1: Player;
  player2: Player;
};

export type Team = {
  type: "TEAM";
  pair1: Pair;
  pair2: Pair;
};

export type NewParticipant = NewPair;

export type Participant = Pair | Team;

/* ---------- assignment ---------- */

export type PairAssignment = {
  type: "PAIR";
  id: string;
};

export type TeamAssignment = {
  type: "TEAM";
  id: string;
};

export type Assignment = TeamAssignment | PairAssignment;

/* ---------- assigned participant ---------- */

export type AssignedPair = Pair & PairAssignment;

export type AssignedTeam = Team & TeamAssignment;

export type AssignedParticipant = AssignedTeam | AssignedPair;

interface PairsParticipants {
  type: "PAIRS";
  ns: string;
  ew: string;
  nsNames?: string | null;
  ewNames?: string | null;
}

export interface BoardInstance {
  roundNumber: number;
  tableNumber: number;
  boardNumber: number;
  participants: PairsParticipants;
  currentResult: string | null;
  status: string | null;
}
