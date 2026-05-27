import { Player } from "@/db/games/shared/tables/players";
import { Direction, PairDirection } from "@/model/common";

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

export type IndividualSeat = {
  type: "INDIVIDUAL";
  tableNumber: number;
  direction: Direction;
};

export type PairSeat = {
  type: "PAIR";
  tableNumber: number;
  direction: PairDirection;
};

export type Seat = IndividualSeat | PairSeat;

/* ---------- participants ---------- */

export type Individual = IndividualSeat & {
  type: "INDIVIDUAL";
  player: Player;
};

export type Pair = PairSeat & {
  type: "PAIR";
  player1: Player;
  player2: Player;
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
