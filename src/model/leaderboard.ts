import {
  Individual,
  IndividualWithPlayer,
  Pair,
  PairWithPlayers,
  Team,
  TeamWithPlayers,
} from "@/model/participants";

/* ---------- ranked result ---------- */

export type RankedResult<T> = T & {
  rank: number;
  tied: boolean;
};

/* ---------- scoring fields ---------- */

export interface MatchpointOverallScore {
  totalMP: number;
  maxMP: number;
}

export interface CrossImpOverallScore {
  crossImps: number;
}

export interface TeamMatchLineScore {
  board: number;
  opponent: string;
  teamScore: number;
  opponentScore: number;
}

export interface TeamMatchScore {
  teamMatchLineScores: TeamMatchLineScore[];
}

export interface OverallTeamResult {
  score: number;
}

/* ---------- generic overall lines ---------- */

export type TeamOverallScoreLine<
  TScore extends object = Record<string, never>,
> = Team & TScore;

export type PairOverallScoreLine<
  TScore extends object = Record<string, never>,
> = Pair & TScore;

export type IndividualOverallScoreLine<
  TScore extends object = Record<string, never>,
> = Individual & TScore;

/* ---------- base overall container ---------- */

export interface OverallScoreBase<TLine> {
  type: OverallScoreType;
  lines: RankedResult<TLine>[];
}

/* ---------- concrete traveller types ---------- */

export type OverallIndividualMPScore = OverallScoreBase<
  IndividualOverallScoreLine<MatchpointOverallScore>
> & { type: "INDIVIDUAL_MP" };

export type OverallIndividualIMPScore = OverallScoreBase<
  IndividualOverallScoreLine<CrossImpOverallScore>
> & { type: "INDIVIDUAL_IMP" };

export type OverallPairMPScore = OverallScoreBase<
  PairOverallScoreLine<MatchpointOverallScore>
> & { type: "PAIR_MP" };

export type OverallPairIMPScore = OverallScoreBase<
  PairOverallScoreLine<CrossImpOverallScore>
> & { type: "PAIR_IMP" };

export type OverallTeamMatchScore = OverallScoreBase<
  TeamOverallScoreLine<TeamMatchScore>
> & { type: "TEAM_MATCH" };

export type OverallTeamScore = OverallScoreBase<
  TeamOverallScoreLine<OverallTeamResult>
> & { type: "TEAM_OVERALL" };

export type OverallScore =
  | OverallIndividualMPScore
  | OverallIndividualIMPScore
  | OverallPairMPScore
  | OverallPairIMPScore
  | OverallTeamMatchScore
  | OverallTeamScore;

export type OverallScoreType =
  | "INDIVIDUAL_MP"
  | "INDIVIDUAL_IMP"
  | "PAIR_MP"
  | "PAIR_IMP"
  | "TEAM_MATCH"
  | "TEAM_OVERALL";

/* ---------- automatic OverallScoreAndParticipants ---------- */

// Map from score type literal to participant type
type ParticipantsMap = {
  INDIVIDUAL_MP: IndividualWithPlayer[];
  INDIVIDUAL_IMP: IndividualWithPlayer[];
  PAIR_MP: PairWithPlayers[];
  PAIR_IMP: PairWithPlayers[];
  TEAM_MATCH: TeamWithPlayers[];
  TEAM_OVERALL: TeamWithPlayers[];
};

// Helper to extract OverallScore by type literal
type OverallScoreByType<T extends OverallScoreType> = Extract<
  OverallScore,
  { type: T }
>;

// Automatic discriminated union for OverallScoreAndParticipants
export type OverallScoreAndParticipant = {
  [K in OverallScoreType]: {
    type: K;
    overallScore: OverallScoreByType<K>;
    participants: ParticipantsMap[K];
  };
}[OverallScoreType];
