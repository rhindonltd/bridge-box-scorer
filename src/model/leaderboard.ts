import {
  IndividualAssignment,
  PairAssignment,
  TeamAssignment,
  TravellerParticipantMode,
} from "@/model/participants";

export type TeamMode = "TEAM";
export type OverallScoreMode = TravellerParticipantMode | TeamMode;

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

/* ---------- mode -> id mapping ---------- */

interface IdFieldByMode {
  INDIVIDUAL: { playerId: string };
  PAIR: { pairId: string };
  TEAM: { teamId: string };
}

/* ---------- scoring mapping ---------- */

interface ScoreByModeAndScoring {
  INDIVIDUAL: {
    MP: MatchpointOverallScore;
    XIMP: CrossImpOverallScore;
  };
  PAIR: {
    MP: MatchpointOverallScore;
    XIMP: CrossImpOverallScore;
  };
  TEAM: {
    MATCH: TeamMatchScore;
    OVERALL: OverallTeamResult;
  };
}

/* ---------- scoring keys per mode ---------- */

export type ScoringByMode<M extends OverallScoreMode> = Extract<
  keyof ScoreByModeAndScoring[M],
  string
>;

/* ---------- type builder ---------- */

export type OverallScoreType<
  M extends OverallScoreMode,
  S extends ScoringByMode<M>,
> = `${M}_${S}`;

/* ---------- line ---------- */

export type OverallLine<
  M extends OverallScoreMode,
  S extends ScoringByMode<M>,
> = IdFieldByMode[M] & ScoreByModeAndScoring[M][S];

/* ---------- container ---------- */

export interface OverallScoreBase<
  M extends OverallScoreMode,
  S extends ScoringByMode<M>,
> {
  type: OverallScoreType<M, S>;
  mode: M;
  scoring: S;
  lines: RankedResult<OverallLine<M, S>>[];
}

/* ---------- unions ---------- */

export type IndividualMatchpointOverallScore = OverallScoreBase<
  "INDIVIDUAL",
  "MP"
>;
export type IndividualXIMPOverallScore = OverallScoreBase<"INDIVIDUAL", "XIMP">;
export type PairMatchpointOverallScore = OverallScoreBase<"PAIR", "MP">;
export type PairXIMPOverallScore = OverallScoreBase<"PAIR", "XIMP">;
export type TeamMatchOverallScore = OverallScoreBase<"TEAM", "MATCH">;
export type TeamOverallOverallScore = OverallScoreBase<"TEAM", "OVERALL">;

export type OverallScore =
  | IndividualMatchpointOverallScore
  | IndividualXIMPOverallScore
  | PairMatchpointOverallScore
  | PairXIMPOverallScore
  | TeamMatchOverallScore
  | TeamOverallOverallScore;

/* ---------- participants mapping ---------- */

interface ParticipantsByOverallScoreMode {
  INDIVIDUAL: IndividualAssignment[];
  PAIR: PairAssignment[];
  TEAM: TeamAssignment[];
}

/* ---------- final combined type ---------- */

export type OverallScoreAndParticipant = {
  [M in OverallScoreMode]: {
    [S in ScoringByMode<M>]: {
      type: OverallScoreType<M, S>;
      overallScore: OverallScoreBase<M, S>;
      participants: ParticipantsByOverallScoreMode[M];
    };
  }[ScoringByMode<M>];
}[OverallScoreMode];

// --------------------
// Example
// --------------------
//
// const exampleOverall: OverallScoreBase<"PAIR", "MP"> = {
//     type: "PAIR_MP",
//     mode: "PAIR",
//     scoring: "MP",
//     lines: [
//         {
//             rank: 1,
//             tied: false,
//             pairId: "P1",
//             totalMP: 60,
//             maxMP: 100,
//         },
//     ],
// };
