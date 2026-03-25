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
