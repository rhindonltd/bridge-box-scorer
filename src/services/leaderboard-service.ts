import "server-only";

import { Db } from "@/db/games";
import { boards, Board } from "@/db/games/tables/boards";
import { findPairs } from "@/db/games/queries/find-pairs";
import { scoreBoard, ScoredBoard } from "@/scoring/traveller/score-traveller";
import { PairTraveller } from "@/model/traveller";
import { BoardOutcome } from "@/model/score";
import { OverallScore } from "@/model/leaderboard";
import { parseSeat } from "@/model/participants";
import "@/scoring/plugins/register";
import { getCombination, getOverallPlugin } from "@/scoring/plugins/registry";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { ScoringType } from "@/db/games/types/scoring-type";

/**
 * A computed leaderboard: the overall score plus the participants it ranks.
 */
export interface LeaderboardResult {
  type: OverallScore["type"];
  overallScore: OverallScore;
  participants: (ReturnType<typeof toParticipant>)[];
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

  const overallPlugin = getOverallPlugin(getCombination(scoringType).overall);
  return overallPlugin.aggregate(
    scoredBoards.map((b) => ({ lines: b.lines })),
  ) as OverallScore;
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
): LeaderboardResult {
  const overallScore = scoreBoardsToOverall(boardRows, scoringType, gameId);
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

  const sections = Array.from(
    new Set([...rowsBySection.keys(), ...pairsBySection.keys()]),
  ).sort();

  return sections.map((section) => {
    const overallScore = scoreBoardsToOverall(
      rowsBySection.get(section) ?? [],
      scoringType,
      section,
    );
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
): Promise<{ scoringType: ScoringType; boardRows: Board[]; pairs: Pairs }> {
  const game = await findGameById(gameId);
  const [boardRows, pairs] = await Promise.all([
    db.select().from(boards) as Promise<Board[]>,
    findPairs(db),
  ]);
  return { scoringType: game!.scoringType, boardRows, pairs };
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
  const { scoringType, boardRows, pairs } = await readLeaderboardInputs(
    db,
    gameId,
  );
  return {
    leaderboard: computeCombined(boardRows, pairs, gameId, scoringType),
    sections: computeSections(boardRows, pairs, scoringType),
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
  const { scoringType, boardRows, pairs } = await readLeaderboardInputs(
    db,
    gameId,
  );
  return computeCombined(boardRows, pairs, gameId, scoringType);
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
  const { scoringType, boardRows, pairs } = await readLeaderboardInputs(
    db,
    gameId,
  );
  return computeSections(boardRows, pairs, scoringType);
}
