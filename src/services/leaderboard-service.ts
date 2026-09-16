import "server-only";

import { Db } from "@/db/games";
import { boards, Board } from "@/db/games/tables/boards";
import { findPairs } from "@/db/games/queries/find-pairs";
import { scoreBoard, ScoredBoard } from "@/scoring/traveller/score-traveller";
import { PairTraveller } from "@/model/traveller";
import { BoardOutcome } from "@/model/score";
import { OverallScore } from "@/model/leaderboard";
import { AssignedPair, AssignedTeam, parseSeat } from "@/model/participants";
import "@/scoring/plugins/register";
import { getCombination, getOverallPlugin } from "@/scoring/plugins/registry";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { findTeams } from "@/db/games/queries/find-teams";
import { ScoringType } from "@/db/games/types/scoring-type";
import { parseSelectedMovement } from "@/model/selected-movement";
import { calculateSwissVpOverall } from "@/scoring/swiss/swiss-vp-overall";
import { calculateSwissMpVpOverall } from "@/scoring/swiss/swiss-mp-vp-overall";
import { calculateSwissTeamsVpOverall } from "@/scoring/swiss/swiss-teams-vp-overall";

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
 * How a Swiss Pairs game derives its per-round Victory Points, or null when the
 * game is not a Swiss VP game (any non-Swiss movement, or a Swiss game whose
 * scoring method has no VP mapping). "IMP" converts each round's head-to-head
 * IMP margin; "MP" converts each round's field matchpoint percentage.
 */
type SwissVpMode = "IMP" | "MP" | null;

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
  isSwissTeams: boolean,
  teams: AssignedTeam[],
): LeaderboardResult {
  // A Swiss Teams game ranks teams on Victory Points; every other game ranks
  // pairs (Swiss VP or the standard board-pooled overall).
  if (isSwissTeams) {
    const overallScore = calculateSwissTeamsVpOverall(boardRows);
    return { type: overallScore.type, overallScore, participants: teams };
  }

  const overallScore =
    scoreSwissVp(boardRows, swissVpMode) ??
    scoreBoardsToOverall(boardRows, scoringType, gameId);
  return {
    type: overallScore.type,
    overallScore,
    participants: pairs.map(toParticipant),
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
  isSwissTeams: boolean,
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
    const { section } = parseSeat(pair.initialSeat);
    const arr = pairsBySection.get(section) ?? [];
    arr.push(pair);
    pairsBySection.set(section, arr);
  }

  // Teams are section-qualified by their home NS seat id (e.g. "A1NS").
  const teamsBySection = new Map<string, AssignedTeam[]>();
  for (const team of teams) {
    const { section } = parseSeat(team.id as Parameters<typeof parseSeat>[0]);
    const arr = teamsBySection.get(section) ?? [];
    arr.push(team);
    teamsBySection.set(section, arr);
  }

  const sections = Array.from(
    new Set([...rowsBySection.keys(), ...pairsBySection.keys()]),
  ).sort();

  return sections.map((section): SectionLeaderboard => {
    const sectionRows = rowsBySection.get(section) ?? [];

    if (isSwissTeams) {
      const overallScore = calculateSwissTeamsVpOverall(sectionRows);
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
    return {
      section,
      type: overallScore.type,
      overallScore,
      participants: (pairsBySection.get(section) ?? []).map(toParticipant),
    };
  });
}

/** Read the scoring type, all board rows and all pairs for a game in one go. */
async function readLeaderboardInputs(
  db: Db,
  gameId: string,
): Promise<{
  scoringType: ScoringType;
  swissVpMode: SwissVpMode;
  isSwissTeams: boolean;
  boardRows: Board[];
  pairs: Pairs;
  teams: AssignedTeam[];
}> {
  const game = await findGameById(gameId);
  const movement = parseSelectedMovement(game?.selectedMovement);
  const isSwissTeams =
    game?.gameType === "TEAMS" && movement?.source === "SWISS_TEAMS";

  const [boardRows, pairs, teams] = await Promise.all([
    db.select().from(boards) as Promise<Board[]>,
    findPairs(db),
    // Teams are derived from the seating; only needed for a Swiss Teams game.
    isSwissTeams ? findTeams(db) : Promise.resolve([] as AssignedTeam[]),
  ]);

  // Swiss Pairs events rank overall on Victory Points, summed per round. The
  // per-round VP source depends on the scoring method: IMP games convert each
  // round's head-to-head IMP margin, MP games convert each round's field
  // matchpoint percentage. Any other movement keeps the board-pooled overall.
  const swissVpMode: SwissVpMode =
    movement?.source === "SWISS" &&
    (game?.scoringType === "IMP" || game?.scoringType === "MP")
      ? game.scoringType
      : null;

  return {
    scoringType: game!.scoringType,
    swissVpMode,
    isSwissTeams,
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
): Promise<{ leaderboard: LeaderboardResult; sections: SectionLeaderboard[] }> {
  const { scoringType, swissVpMode, isSwissTeams, boardRows, pairs, teams } =
    await readLeaderboardInputs(db, gameId);
  return {
    leaderboard: computeCombined(
      boardRows,
      pairs,
      gameId,
      scoringType,
      swissVpMode,
      isSwissTeams,
      teams,
    ),
    sections: computeSections(
      boardRows,
      pairs,
      scoringType,
      swissVpMode,
      isSwissTeams,
      teams,
    ),
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
  const { scoringType, swissVpMode, isSwissTeams, boardRows, pairs, teams } =
    await readLeaderboardInputs(db, gameId);
  return computeCombined(
    boardRows,
    pairs,
    gameId,
    scoringType,
    swissVpMode,
    isSwissTeams,
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
  const { scoringType, swissVpMode, isSwissTeams, boardRows, pairs, teams } =
    await readLeaderboardInputs(db, gameId);
  return computeSections(
    boardRows,
    pairs,
    scoringType,
    swissVpMode,
    isSwissTeams,
    teams,
  );
}
