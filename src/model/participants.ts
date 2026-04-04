import { Direction, PairDirection } from "@/model/common";

export type Player = {
  firstName: string;
  lastName: string;
  nationalId?: number;
};

export interface TravellerPairParticipants {
  nsId: string;
  ewId: string;
}

export interface TravellerIndividualParticipants {
  nId: string;
  sId: string;
  eId: string;
  wId: string;
}

/* ---------- participants ---------- */

export type Team = {
  type: "TEAM";
  players: Player[];
  initialTableNumber: number;
};

export type Pair = {
  type: "PAIR";
  player1: Player;
  player2: Player;
  initialTableNumber: number;
  initialDirection: PairDirection;
};

export type Individual = {
  type: "INDIVIDUAL";
  player: Player;
  initialTableNumber: number;
  initialDirection: Direction;
};

/* ---------- participant assignments ---------- */

export type TeamAssignment = Team & {
  teamId: string;
};

export type PairAssignment = Pair & {
  pairId: string;
};

export type IndividualAssignment = Individual & {
  playerId: string;
};

/* ---------- unions ---------- */

export type Participant = Team | Pair | Individual;
export type Assignment = TeamAssignment | PairAssignment | IndividualAssignment;

export type ParticipantType = "TEAM" | "PAIR" | "INDIVIDUAL";
