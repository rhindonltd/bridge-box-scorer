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
  teamId: string;
};

export type Pair = {
  type: "PAIR";
  pairId: string;
};

export type Individual = {
  type: "INDIVIDUAL";
  playerId: string;
};

/* ---------- participants and players ---------- */

export type TeamWithPlayers = Team & {
  players: Player[];
};

export type PairWithPlayers = Pair & {
  player1: Player;
  player2: Player;
};

export type IndividualWithPlayer = Individual & {
  player: Player;
};

/* ---------- unions ---------- */

export type Traveller = Team | Pair | Individual;

export type ParticipantType = "TEAM" | "PAIR" | "INDIVIDUAL";
