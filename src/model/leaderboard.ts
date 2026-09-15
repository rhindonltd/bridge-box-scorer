import { AssignedPair, TravellerParticipantMode } from "@/model/participants";
import { AssignedTeam } from "./participants";

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

export interface ImpOverallScore {
  imps: number;
}

/**
 * Swiss Pairs overall (Victory Points) standing for one pair.
 *
 * Each Swiss round is a head-to-head match scored into Victory Points (VP); a
 * pair's session result is the sum of its per-round VPs, and pairs rank
 * highest-total-first. `vpByRound` maps a round number to that pair's VP for
 * the round, present only for rounds the pair has a completed (fully scored)
 * match in — a missing round renders as an empty cell.
 */
export interface SwissVpOverallScore {
  totalVP: number;
  vpByRound: Record<number, number>;
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
  PAIR: { pairId: string };
  TEAM: { teamId: string };
}

/* ---------- scoring mapping ---------- */

interface ScoreByModeAndScoring {
  PAIR: {
    MP: MatchpointOverallScore;
    XIMP: CrossImpOverallScore;
    IMP: ImpOverallScore;
    SWISS_VP: SwissVpOverallScore;
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

export type PairMatchpointOverallScore = OverallScoreBase<"PAIR", "MP">;
export type PairXIMPOverallScore = OverallScoreBase<"PAIR", "XIMP">;
export type PairIMPOverallScore = OverallScoreBase<"PAIR", "IMP">;
export type PairSwissVpOverallScore = OverallScoreBase<"PAIR", "SWISS_VP">;
export type TeamMatchOverallScore = OverallScoreBase<"TEAM", "MATCH">;
export type TeamOverallOverallScore = OverallScoreBase<"TEAM", "OVERALL">;

export type OverallScore =
  | PairMatchpointOverallScore
  | PairXIMPOverallScore
  | PairIMPOverallScore
  | PairSwissVpOverallScore
  | TeamMatchOverallScore
  | TeamOverallOverallScore;

/* ---------- participants mapping ---------- */

interface ParticipantsByOverallScoreMode {
  PAIR: AssignedPair[];
  TEAM: AssignedTeam[];
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
