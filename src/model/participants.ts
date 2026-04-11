import { Direction, PairDirection } from "@/model/common";

export type Player = {
  firstName: string;
  lastName: string;
  nationalId?: number;
};

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

/* ---------- participants ---------- */

export type Individual = {
  type: "INDIVIDUAL";
  player: Player;
  initialTableNumber: number;
  initialDirection: Direction;
};

export type Pair = {
  type: "PAIR";
  player1: Player;
  player2: Player;
  initialTableNumber: number;
  initialDirection: PairDirection;
};

export type Team = {
  type: "TEAM";
  pair1: Pair;
  pair2: Pair;
};

/* ---------- participant assignments ---------- */

export type IndividualAssignment = Individual & {
  playerId: string;
};

export type PairAssignment = Pair & {
  pairId: string;
};

export type TeamAssignment = Team & {
  teamId: string;
};

/* ---------- unions ---------- */

export type Assignment = TeamAssignment | PairAssignment | IndividualAssignment;
