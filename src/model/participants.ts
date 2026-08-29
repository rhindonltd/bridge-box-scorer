import { NewPlayer, Player } from "@/db/games/tables/players";
import { PairDirection, PairDirections } from "@/model/common";

export interface ParticipantsByMode {
  PAIR: {
    nsId: string;
    ewId: string;
  };
}

export type TravellerParticipantMode = "PAIR";

/* ---------- seat ---------- */

export type PairSeat = `${number}${PairDirection}`;

export type Seat = PairSeat;

export function isPairSeat(seat: Seat): seat is PairSeat {
  return PairDirections.some((direction) => seat.endsWith(direction));
}

export function parseSeat(seat: Seat) {
  return {
    tableNumber: Number(seat.slice(0, -2)),
    direction: seat.slice(-2) as PairDirection,
  };
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
