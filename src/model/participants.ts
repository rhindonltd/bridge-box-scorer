export type Player = {
  firstName: string;
  lastName: string;
  nationalId?: number;
};

export interface TravellerTeamParticipants {
  nsTeamId: string;
  ewTeamId: string;
}

export interface TravellerPairParticipants {
  nsPairId: string;
  ewPairId: string;
}

export interface TravellerIndividualParticipants {
  nPlayerId: string;
  sPlayerId: string;
  ePlayerId: string;
  wPlayerId: string;
}

export interface OverallTeamParticipant {
  teamId: string;
}

export interface OverallPairParticipant {
  pairId: string;
}

export interface OverallIndividualParticipant {
  playerId: string;
}

export interface Players {
  players: Player[];
}

/* ---------- generic participants ---------- */

export type Team = OverallTeamParticipant &
  Players & {
    type: "TEAM";
  };

export type Pair = OverallPairParticipant &
  Players & {
    type: "PAIR";
  };

export type Individual = OverallIndividualParticipant &
  Players & {
    type: "INDIVIDUAL";
  };
