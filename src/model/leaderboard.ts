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

/**
 * A board-comparison teams standing for one team (shared by Board-a-Match and
 * Point-a-Board).
 *
 * Each board of a team match is its own mini-match: the team with the better
 * score wins the board, an equal score is a tie, the worse score loses. The
 * won/played figures are held in NATIVE BOARD UNITS (win = 1, tie = 0.5, loss =
 * 0) regardless of the scale the game is scored on; the display/export scale
 * (Board-a-Match = 1 point per board, Point-a-Board = 2) is applied at the
 * boundary. `byRound` maps a round number to that team's won/played for the
 * round, used by the barometer (Swiss Teams) per-round table; the cumulative
 * `totalWon` / `totalPlayed` drive the non-barometer (Round Robin) table and
 * the percentage view (`totalWon / totalPlayed * 100`, scale-independent).
 */
export interface BoardComparisonOverallScore {
  totalWon: number;
  totalPlayed: number;
  byRound: Record<number, { won: number; played: number }>;
}

/**
 * @deprecated Alias kept for readability at BAM call sites; identical to
 * {@link BoardComparisonOverallScore}.
 */
export type BamOverallScore = BoardComparisonOverallScore;

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
    SWISS_VP: SwissVpOverallScore;
    BAM: BoardComparisonOverallScore;
    PAB: BoardComparisonOverallScore;
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
export type TeamSwissVpOverallScore = OverallScoreBase<"TEAM", "SWISS_VP">;

/**
 * Board-a-Match teams standing. Carries an extra `barometer` flag (not part of
 * the generic score container) that tells the leaderboard view which layout to
 * render: a barometer movement (Swiss Teams, all tables on the same boards each
 * round) shows a per-round table; a non-barometer movement (Round Robin Teams,
 * teams meeting on different boards each round) shows a single cumulative total.
 */
export type TeamBamOverallScore = OverallScoreBase<"TEAM", "BAM"> & {
  barometer: boolean;
};

/**
 * Point-a-Board teams standing. Identical to {@link TeamBamOverallScore} except
 * each board is worth 2 points (win) / 1 (tie) / 0 (loss) rather than 1/0.5/0.
 * The line data is still in native board units; the ×2 scale is applied by the
 * view and the USEBIO export.
 */
export type TeamPabOverallScore = OverallScoreBase<"TEAM", "PAB"> & {
  barometer: boolean;
};

export type OverallScore =
  | PairMatchpointOverallScore
  | PairXIMPOverallScore
  | PairIMPOverallScore
  | PairSwissVpOverallScore
  | TeamMatchOverallScore
  | TeamOverallOverallScore
  | TeamSwissVpOverallScore
  | TeamBamOverallScore
  | TeamPabOverallScore;

/* ---------- participants mapping ---------- */

interface ParticipantsByOverallScoreMode {
  PAIR: AssignedPair[];
  TEAM: AssignedTeam[];
}

/* ---------- final combined type ---------- */

/**
 * The concrete {@link OverallScore} union member for a given `type` tag. Used
 * so `OverallScoreAndParticipant` carries the exact member (including any
 * per-variant extensions such as `TeamBamOverallScore.barometer`) rather than
 * the bare `OverallScoreBase`, which would drop those extra fields.
 */
type OverallScoreByType<T extends string> = Extract<OverallScore, { type: T }>;

export type OverallScoreAndParticipant = {
  [M in OverallScoreMode]: {
    [S in ScoringByMode<M>]: {
      type: OverallScoreType<M, S>;
      overallScore: OverallScoreByType<OverallScoreType<M, S>>;
      participants: ParticipantsByOverallScoreMode[M];
    };
  }[ScoringByMode<M>];
}[OverallScoreMode];
