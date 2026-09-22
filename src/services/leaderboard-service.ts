import "server-only";

import { Db } from "@/db/games";
import { boards, Board } from "@/db/games/tables/boards";
import { findPairs } from "@/db/games/queries/find-pairs";
import { scoreBoard, ScoredBoard } from "@/scoring/traveller/score-traveller";
import { PairTraveller } from "@/model/traveller";
import { BoardOutcome } from "@/model/score";
import { OverallScore } from "@/model/leaderboard";
import {
  AssignedPair,
  AssignedTeam,
  parseSeat,
  sectionOf,
} from "@/model/participants";
import "@/scoring/plugins/register";
import { getCombination, getOverallPlugin } from "@/scoring/plugins/registry";
import { rank } from "@/scoring/overall/rank";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { findTeams } from "@/db/games/queries/find-teams";
import { ScoringType } from "@/db/games/types/scoring-type";
import { parseSelectedMovement } from "@/model/selected-movement";
import {
  classifyEvent,
  isTwoWinnerPairs,
  SwissVpMode,
} from "@/model/event-format";
import { calculateSwissVpOverall } from "@/scoring/swiss/swiss-vp-overall";
import { calculateSwissMpVpOverall } from "@/scoring/swiss/swiss-mp-vp-overall";
import { calculateTeamsVpOverall } from "@/scoring/swiss/teams-vp-overall";
import { calculateTeamsImpAggregateOverall } from "@/scoring/swiss/teams-imp-aggregate-overall";
import {
  BoardComparisonScoring,
  calculateTeamsBoardComparisonOverall,
} from "@/scoring/swiss/teams-board-comparison-overall";

/**
 * A computed leaderboard: the overall score plus the participants it ranks.
 * Participants are pairs for pair games and teams for team games; the pairing
 * with the overall score is enforced by {@link OverallScoreAndParticipant} at
 * the boundary this feeds.
 */
export interface LeaderboardResult {
  type: OverallScore["type"];
  overallScore: OverallScore;
  participants: AssignedPair[] | AssignedTeam[];
  /**
   * For a two-winner pairs event (a standard Mitchell, where North/South and
   * East/West are separate fields), the same standings split into two
   * independent rankings — one per direction — each ranked within its own
   * field. Absent for one-winner and teams events, where `overallScore` /
   * `participants` are the single ranking. When present, `overallScore` /
   * `participants` still hold the pooled ranking (unused by the two-winner
   * display) so existing single-ranking consumers keep working.
   */
  directional?: {
    ns: { overallScore: OverallScore; participants: AssignedPair[] };
    ew: { overallScore: OverallScore; participants: AssignedPair[] };
  };
}

/**
 * A per-section leaderboard, tagged with the section it belongs to.
 */
export interface SectionLeaderboard extends LeaderboardResult {
  section: string;
}

function toParticipant(p: Awaited<ReturnType<typeof findPairs>>[number]) {
  return { ...p, type: "PAIR" as const, id: p.initialSeat };
}

/**
 * Compute the Swiss VP overall for a set of board rows under the given VP mode.
 * Returns null when there is no Swiss VP mode, so callers fall back to the
 * standard board-pooled overall.
 */
function scoreSwissVp(boardRows: Board[], mode: SwissVpMode) {
  if (mode === "IMP") return calculateSwissVpOverall(boardRows);
  if (mode === "MP") return calculateSwissMpVpOverall(boardRows);
  return null;
}

/**
 * Score a set of board rows into an overall score under the given scoring type.
 * Rows are bucketed by board number; every row for a board forms one traveller,
 * so pooling rows from multiple sections combines them into a single field.
 *
 * @param sectionLabel  The value written to each traveller's `section` field.
 *   For a per-section leaderboard this is the real section; for the combined
 *   leaderboard it is a synthetic label (e.g. the gameId) since the traveller
 *   pools every section.
 */
function scoreBoardsToOverall(
  boardRows: Board[],
  scoringType: ScoringType,
  sectionLabel: string,
): OverallScore {
  const boardMap = new Map<number, Board[]>();
  for (const row of boardRows) {
    const arr = boardMap.get(row.boardNumber) ?? [];
    arr.push(row);
    boardMap.set(row.boardNumber, arr);
  }

  const scoredBoards: ScoredBoard[] = [];
  for (const [boardNumber, rows] of boardMap) {
    const linesWithResults = rows.filter((r) => {
      const result = r.directorOverrideResult ?? r.confirmedResult;
      return result != null;
    });

    if (linesWithResults.length === 0) continue;

    const pairTraveller: PairTraveller = {
      type: "PAIR",
      mode: "PAIR",
      board: boardNumber,
      section: sectionLabel,
      lines: linesWithResults.map((r) => ({
        nsId: r.ns,
        ewId: r.ew,
        outcome: (r.directorOverrideResult ??
          r.confirmedResult) as BoardOutcome,
      })),
    };

    scoredBoards.push(scoreBoard(pairTraveller, scoringType));
  }

  // Swiss sit-outs: credit each idle (bye) pair a compensatory result for the
  // boards it missed, so a forced bye doesn't drag its standing down. This adds
  // synthetic scored lines alongside the real ones before aggregation, keyed by
  // the sit-out pair's participant id, and is a no-op when there are no
  // SIT_OUT rows (i.e. for every non-Swiss / even-field game).
  scoredBoards.push(
    ...swissSitOutScoredBoards(boardMap, scoringType, scoredBoards),
  );

  const overallPlugin = getOverallPlugin(getCombination(scoringType).overall);
  return overallPlugin.aggregate(
    scoredBoards.map((b) => ({ lines: b.lines })),
  ) as OverallScore;
}

/**
 * The value a pair line is ranked on, by pair scoring type. Mirrors each
 * overall plugin's `sort` key (MP ranks on percentage, IMP on total imps,
 * Cross-IMP on total cross-imps), so re-ranking a partition here matches how
 * the plugin ranked the pooled field.
 */
function pairRankValue(line: OverallScore["lines"][number]): number {
  if ("totalMP" in line) {
    return line.maxMP > 0 ? line.totalMP / line.maxMP : 0;
  }
  if ("imps" in line) return line.imps;
  if ("crossImps" in line) return line.crossImps;
  /* v8 ignore next -- pairRankValue is only called for MP/IMP/XIMP pair lines */
  return 0;
}

/**
 * Split a pooled pairs overall score into two independent rankings by seat
 * direction (a two-winner Mitchell: North/South and East/West are separate
 * fields). The per-board matchpointing is unchanged — the same field-wide
 * values are used — but each direction is ranked only within itself, so an NS
 * pair's rank/percentage reflects the NS field only, and likewise for EW.
 *
 * The pooled score's line values are reused verbatim; only rank/tied are
 * recomputed per direction. `pairId` is a section-qualified seat ending in
 * NS/EW (see {@link toParticipant}), so the direction is read straight from it.
 */
function splitByDirection(
  overallScore: OverallScore,
  participants: AssignedPair[],
): LeaderboardResult["directional"] {
  const forDirection = (direction: "NS" | "EW") => {
    const lines = overallScore.lines.filter(
      (l) => "pairId" in l && parseSeat(l.pairId).direction === direction,
    );
    // Re-rank within this direction's field, dropping the pooled rank/tied and
    // recomputing them from the same value the plugin sorted on.
    const reranked = rank(
      lines.map(({ ...rest }) => rest),
      pairRankValue,
    ) as OverallScore["lines"];

    const directionParticipants = participants.filter(
      (p) => parseSeat(p.initialSeat).direction === direction,
    );

    return {
      overallScore: { ...overallScore, lines: reranked } as OverallScore,
      participants: directionParticipants,
    };
  };

  return { ns: forDirection("NS"), ew: forDirection("EW") };
}

/** The 60% (average-plus) award a bye pair receives under matchpoints. */
const SIT_OUT_MP_FRACTION = 0.6;

/**
 * Build synthetic scored boards that credit Swiss sit-out (bye) pairs for the
 * boards they missed.
 *
 * A SIT_OUT board row carries the sitting-out pair on its `ns` seat (its `ew`
 * is a phantom that maps to no participant). For each such board we emit one
 * synthetic scored line that the overall aggregator sums for that pair:
 *   - Matchpoints: 60% of the board top. The per-board top for the round is the
 *     same for every table, so it is read from a real (played) board that
 *     round: `maxMatchPoints`. When no board that round has been scored yet,
 *     the top is unknown and the bye is credited nothing (it will fill in once
 *     the round's real results arrive).
 *   - IMP / Cross-IMP: these have no fixed per-board maximum, so "60% of max"
 *     is undefined; the fair, standings-protecting credit is the field average,
 *     i.e. zero net imps. The synthetic line therefore contributes 0, which
 *     still counts the board so the pair isn't under-boarded.
 *
 * The phantom opponent id is emitted on the other seat; because it matches no
 * participant, its (zero) contribution is harmless.
 */
function swissSitOutScoredBoards(
  boardMap: Map<number, Board[]>,
  scoringType: ScoringType,
  playedScoredBoards: ScoredBoard[],
): ScoredBoard[] {
  const pluginId = getCombination(scoringType).perBoard;

  // Per-round matchpoint top, keyed by board number, read from a real scored
  // line for that board (all tables share the same top on a given board).
  const topByBoard = new Map<number, number>();
  if (pluginId === "MP") {
    for (const sb of playedScoredBoards) {
      const lines = sb.lines as { maxMatchPoints?: number }[];
      const withTop = lines.find(
        (l) => typeof l.maxMatchPoints === "number" && l.maxMatchPoints > 0,
      );
      if (withTop) topByBoard.set(sb.board, withTop.maxMatchPoints!);
    }
  }

  const synthetic: ScoredBoard[] = [];

  for (const [boardNumber, rows] of boardMap) {
    for (const row of rows) {
      if (row.status !== "SIT_OUT") continue;

      const byePair = row.ns; // sit-out pair sits on the NS seat
      const phantom = row.ew;

      if (pluginId === "MP") {
        const top = topByBoard.get(boardNumber);
        if (top == null) continue; // no scored sibling board yet
        synthetic.push({
          pluginId,
          board: boardNumber,
          lines: [
            {
              nsId: byePair,
              ewId: phantom,
              score: null,
              maxMatchPoints: top,
              nsMatchPoints: SIT_OUT_MP_FRACTION * top,
              ewMatchPoints: 0,
            },
          ],
        });
      } else if (pluginId === "IMP") {
        synthetic.push({
          pluginId,
          board: boardNumber,
          lines: [
            { nsId: byePair, ewId: phantom, score: null, nsImps: 0, ewImps: 0 },
          ],
        });
      } else {
        // PAIR_XIMP
        synthetic.push({
          pluginId,
          board: boardNumber,
          lines: [
            {
              nsId: byePair,
              ewId: phantom,
              score: null,
              nsCrossImps: 0,
              ewCrossImps: 0,
            },
          ],
        });
      }
    }
  }

  return synthetic;
}

type Pairs = Awaited<ReturnType<typeof findPairs>>;

/**
 * Pure combined leaderboard: pool all sections' results per board number into
 * one traveller and score them together, producing a single ranking across the
 * whole game (bucketing purely by board number, preserving the pre-sections
 * behaviour). Operates on already-read board/pair rows.
 */
function computeCombined(
  boardRows: Board[],
  pairs: Pairs,
  gameId: string,
  scoringType: ScoringType,
  swissVpMode: SwissVpMode,
  isTeamsVp: boolean,
  teamsImpAggregate: boolean,
  teamsBoardComparison: BoardComparisonScoring | null,
  barometer: boolean,
  twoWinner: boolean,
  teams: AssignedTeam[],
): LeaderboardResult {
  // A board-comparison teams game (BAM/PAB) ranks teams on boards won; a
  // teams-VP game ranks teams on Victory Points; an aggregate-IMP teams game
  // ranks teams on total net IMPs; every other game ranks pairs (Swiss VP or
  // the standard board-pooled overall).
  if (teamsBoardComparison !== null) {
    const overallScore = calculateTeamsBoardComparisonOverall(boardRows, {
      barometer,
      scoring: teamsBoardComparison,
    });
    return { type: overallScore.type, overallScore, participants: teams };
  }

  if (teamsImpAggregate) {
    const overallScore = calculateTeamsImpAggregateOverall(boardRows, {
      barometer,
    });
    return { type: overallScore.type, overallScore, participants: teams };
  }

  if (isTeamsVp) {
    const overallScore = calculateTeamsVpOverall(boardRows);
    return { type: overallScore.type, overallScore, participants: teams };
  }

  const overallScore =
    scoreSwissVp(boardRows, swissVpMode) ??
    scoreBoardsToOverall(boardRows, scoringType, gameId);
  const participants = pairs.map(toParticipant);
  return {
    type: overallScore.type,
    overallScore,
    participants,
    // Two-winner Mitchell: also expose NS and EW as separate rankings. Swiss VP
    // is one-winner, so only split the board-pooled overall.
    ...(twoWinner && swissVpMode === null
      ? { directional: splitByDirection(overallScore, participants) }
      : {}),
  };
}

/**
 * Pure per-section leaderboards: each section is scored independently (only its
 * own board rows are pooled and only its own participants returned), in
 * ascending letter order. Operates on already-read board/pair rows.
 */
function computeSections(
  boardRows: Board[],
  pairs: Pairs,
  scoringType: ScoringType,
  swissVpMode: SwissVpMode,
  isTeamsVp: boolean,
  teamsImpAggregate: boolean,
  teamsBoardComparison: BoardComparisonScoring | null,
  barometer: boolean,
  twoWinner: boolean,
  teams: AssignedTeam[],
): SectionLeaderboard[] {
  const rowsBySection = new Map<string, Board[]>();
  for (const row of boardRows) {
    const arr = rowsBySection.get(row.section) ?? [];
    arr.push(row);
    rowsBySection.set(row.section, arr);
  }

  const pairsBySection = new Map<string, Pairs>();
  for (const pair of pairs) {
    const section = sectionOf(pair.initialSeat);
    const arr = pairsBySection.get(section) ?? [];
    arr.push(pair);
    pairsBySection.set(section, arr);
  }

  // Teams are section-qualified by their home NS seat id (e.g. "A1NS").
  const teamsBySection = new Map<string, AssignedTeam[]>();
  for (const team of teams) {
    const section = sectionOf(team.id);
    const arr = teamsBySection.get(section) ?? [];
    arr.push(team);
    teamsBySection.set(section, arr);
  }

  const sections = Array.from(
    new Set([...rowsBySection.keys(), ...pairsBySection.keys()]),
  ).sort();

  return sections.map((section): SectionLeaderboard => {
    const sectionRows = rowsBySection.get(section) ?? [];

    if (teamsBoardComparison !== null) {
      const overallScore = calculateTeamsBoardComparisonOverall(sectionRows, {
        barometer,
        scoring: teamsBoardComparison,
      });
      return {
        section,
        type: overallScore.type,
        overallScore,
        participants: teamsBySection.get(section) ?? [],
      };
    }

    if (teamsImpAggregate) {
      const overallScore = calculateTeamsImpAggregateOverall(sectionRows, {
        barometer,
      });
      return {
        section,
        type: overallScore.type,
        overallScore,
        participants: teamsBySection.get(section) ?? [],
      };
    }

    if (isTeamsVp) {
      const overallScore = calculateTeamsVpOverall(sectionRows);
      return {
        section,
        type: overallScore.type,
        overallScore,
        participants: teamsBySection.get(section) ?? [],
      };
    }

    const overallScore =
      scoreSwissVp(sectionRows, swissVpMode) ??
      scoreBoardsToOverall(sectionRows, scoringType, section);
    const sectionParticipants = (pairsBySection.get(section) ?? []).map(
      toParticipant,
    );
    return {
      section,
      type: overallScore.type,
      overallScore,
      participants: sectionParticipants,
      // Two-winner Mitchell: split each section into its own NS and EW
      // rankings too. Swiss VP is one-winner, so only split the board-pooled
      // overall.
      ...(twoWinner && swissVpMode === null
        ? { directional: splitByDirection(overallScore, sectionParticipants) }
        : {}),
    };
  });
}

/** Read the scoring type, all board rows and all pairs for a game in one go. */
async function readLeaderboardInputs(
  db: Db,
  gameId: string,
): Promise<{
  scoringType: ScoringType;
  combinedRanking: boolean;
  swissVpMode: SwissVpMode;
  isTeamsVp: boolean;
  teamsImpAggregate: boolean;
  teamsBoardComparison: BoardComparisonScoring | null;
  barometer: boolean;
  twoWinner: boolean;
  boardRows: Board[];
  pairs: Pairs;
  teams: AssignedTeam[];
}> {
  const game = await findGameById(gameId);
  const movement = parseSelectedMovement(game?.selectedMovement);

  // Single classification point: what scoring format this game runs under and,
  // for Swiss Pairs, how its per-round VP is derived.
  const classification = classifyEvent(
    game!.gameType,
    game!.scoringType,
    movement,
  );
  const isTeamsVp = classification.format === "TEAMS_VP";
  // An aggregate-IMP teams format: ranks teams on total net IMPs (no VP).
  const teamsImpAggregate = classification.format === "TEAMS_IMP_AGG";
  // A board-comparison teams format (Board-a-Match / Point-a-Board), or null
  // for any other format. Carries the scale directly so the compute functions
  // pass it straight to the shared scorer.
  const teamsBoardComparison: BoardComparisonScoring | null =
    classification.format === "TEAMS_BAM"
      ? "BAM"
      : classification.format === "TEAMS_PAB"
        ? "PAB"
        : null;
  const swissVpMode: SwissVpMode = classification.swissVpMode;

  // A barometer teams movement (Swiss Teams: all tables play the same boards
  // each round) drives the per-round table; a fixed-schedule movement (Round
  // Robin) drives the cumulative table. Only meaningful for the teams formats.
  const barometer = movement?.source === "SWISS_TEAMS";

  // A two-winner pairs movement (standard Mitchell) is ranked as separate NS
  // and EW fields.
  const twoWinner = isTwoWinnerPairs(game!.gameType, movement);

  const [boardRows, pairs, teams] = await Promise.all([
    db.select().from(boards) as Promise<Board[]>,
    findPairs(db),
    // Teams are derived from the seating; needed for any teams game (VP,
    // aggregate IMP, BAM, or PAB).
    isTeamsVp || teamsImpAggregate || teamsBoardComparison !== null
      ? findTeams(db)
      : Promise.resolve([] as AssignedTeam[]),
  ]);

  return {
    scoringType: game!.scoringType,
    combinedRanking: game!.combinedRanking,
    swissVpMode,
    isTeamsVp,
    teamsImpAggregate,
    teamsBoardComparison,
    barometer,
    twoWinner,
    boardRows,
    pairs,
    teams,
  };
}

/**
 * Read the game's scoring type, board rows and pairs ONCE, then compute both
 * the combined and per-section leaderboards from that single read. This is the
 * entry point to use when both are needed (e.g. the leaderboard snapshot),
 * avoiding the duplicate full-table reads that calling the two `compute*`
 * functions separately would incur.
 */
export async function buildLeaderboards(
  db: Db,
  gameId: string,
): Promise<{
  leaderboard: LeaderboardResult | null;
  sections: SectionLeaderboard[];
}> {
  const {
    scoringType,
    combinedRanking,
    swissVpMode,
    isTeamsVp,
    teamsImpAggregate,
    teamsBoardComparison,
    barometer,
    twoWinner,
    boardRows,
    pairs,
    teams,
  } = await readLeaderboardInputs(db, gameId);

  const sections = computeSections(
    boardRows,
    pairs,
    scoringType,
    swissVpMode,
    isTeamsVp,
    teamsImpAggregate,
    teamsBoardComparison,
    barometer,
    twoWinner,
    teams,
  );

  // The director can turn off the combined overall ranking for a multi-section
  // event, keeping sections separate. It stays on by default, and is always
  // produced for a single-section game (where "combined" and the one section
  // are identical anyway).
  const showCombined = combinedRanking || sections.length <= 1;

  return {
    leaderboard: showCombined
      ? computeCombined(
          boardRows,
          pairs,
          gameId,
          scoringType,
          swissVpMode,
          isTeamsVp,
          teamsImpAggregate,
          teamsBoardComparison,
          barometer,
          twoWinner,
          teams,
        )
      : null,
    sections,
  };
}

/**
 * Compute the combined leaderboard: all sections' results for a given board
 * number are pooled into one traveller and scored together, producing a single
 * ranking across the whole game. Reads once and computes only the combined
 * result (for callers that need just it).
 */
export async function computeLeaderboard(
  db: Db,
  gameId: string,
): Promise<LeaderboardResult> {
  const {
    scoringType,
    swissVpMode,
    isTeamsVp,
    teamsImpAggregate,
    teamsBoardComparison,
    barometer,
    twoWinner,
    boardRows,
    pairs,
    teams,
  } = await readLeaderboardInputs(db, gameId);
  return computeCombined(
    boardRows,
    pairs,
    gameId,
    scoringType,
    swissVpMode,
    isTeamsVp,
    teamsImpAggregate,
    teamsBoardComparison,
    barometer,
    twoWinner,
    teams,
  );
}

/**
 * Compute one leaderboard per section. Each section is scored independently:
 * only that section's board rows are pooled, and only that section's
 * participants are returned. Sections are returned in ascending letter order.
 * Reads once and computes only the per-section result.
 */
export async function computeSectionLeaderboards(
  db: Db,
  gameId: string,
): Promise<SectionLeaderboard[]> {
  const {
    scoringType,
    swissVpMode,
    isTeamsVp,
    teamsImpAggregate,
    teamsBoardComparison,
    barometer,
    twoWinner,
    boardRows,
    pairs,
    teams,
  } = await readLeaderboardInputs(db, gameId);
  return computeSections(
    boardRows,
    pairs,
    scoringType,
    swissVpMode,
    isTeamsVp,
    teamsImpAggregate,
    teamsBoardComparison,
    barometer,
    twoWinner,
    teams,
  );
}
