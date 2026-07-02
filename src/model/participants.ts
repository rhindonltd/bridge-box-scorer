import { NewPlayer, Player } from "@/db/games/shared/tables/players";
import { Direction, PairDirection, PairDirections } from "@/model/common";

export interface ParticipantsByMode {
  INDIVIDUAL: {
    nId: string;
    sId: string;
    eId: string;
    wId: string;
  };
  PAIR: {
    nsId: string;
    ewId: string;
  };
}

export type TravellerParticipantMode = "INDIVIDUAL" | "PAIR";

/* ---------- seat ---------- */

export type IndividualSeat = `${number}${Direction}`;
export type PairSeat = `${number}${PairDirection}`;

export type Seat = IndividualSeat | PairSeat;

export function isPairSeat(seat: Seat): seat is PairSeat {
  return PairDirections.some((direction) => seat.endsWith(direction));
}

export function parseSeat(seat: Seat) {
  if (isPairSeat(seat)) {
    return {
      tableNumber: Number(seat.slice(0, -2)),
      direction: seat.slice(-2) as PairDirection,
    };
  }

  return {
    tableNumber: Number(seat.slice(0, -1)),
    direction: seat.slice(-1) as Direction,
  };
}

/* ---------- participants ---------- */

export type NewIndividual = {
  type: "INDIVIDUAL";
  initialSeat: IndividualSeat;
  player: NewPlayer;
};

export type Individual = {
  type: "INDIVIDUAL";
  initialSeat: IndividualSeat;
  player: Player;
};

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

export type NewParticipant = NewIndividual | NewPair;

export type Participant = Individual | Pair | Team;

/* ---------- assignment ---------- */

export type IndividualAssignment = {
  type: "INDIVIDUAL";
  id: string;
};

export type PairAssignment = {
  type: "PAIR";
  id: string;
};

export type TeamAssignment = {
  type: "TEAM";
  id: string;
};

export type Assignment = TeamAssignment | PairAssignment | IndividualAssignment;

/* ---------- assigned participant ---------- */

export type AssignedIndividual = Individual & IndividualAssignment;

export type AssignedPair = Pair & PairAssignment;

export type AssignedTeam = Team & TeamAssignment;

export type AssignedParticipant =
  | AssignedTeam
  | AssignedPair
  | AssignedIndividual;
