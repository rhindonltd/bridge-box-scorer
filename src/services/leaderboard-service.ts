import "server-only";

import { Db } from "@/db/games";
import { boards } from "@/db/games/tables/boards";
import { findPairs } from "@/db/games/queries/find-pairs";
import { scoreBoard, ScoredBoard } from "@/scoring/traveller/score-traveller";
import { PairTraveller } from "@/model/traveller";
import { BoardOutcome } from "@/model/score";
import { OverallScore } from "@/model/leaderboard";
import "@/scoring/plugins/register";
import { getCombination, getOverallPlugin } from "@/scoring/plugins/registry";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";

export async function computeLeaderboard(db: Db, gameId: string) {
  const game = await findGameById(gameId);

  const scoringType = game!.scoringType;

  const allBoardRows = await db.select().from(boards);

  const boardMap = new Map<number, (typeof allBoardRows)[number][]>();
  for (const row of allBoardRows) {
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
      section: gameId,
      lines: linesWithResults.map((r) => ({
        nsId: r.ns,
        ewId: r.ew,
        outcome: (r.directorOverrideResult ??
          r.confirmedResult) as BoardOutcome,
      })),
    };

    scoredBoards.push(scoreBoard(pairTraveller, scoringType));
  }

  // Aggregation is driven by the overall plugin for this scoring type; the
  // per-board scored lines are the aggregator's input.
  const overallPlugin = getOverallPlugin(getCombination(scoringType).overall);
  const overallScore = overallPlugin.aggregate(
    scoredBoards.map((b) => ({ lines: b.lines })),
  ) as OverallScore;

  return {
    type: overallScore.type,
    overallScore,
    participants: (await findPairs(db)).map((p) => ({
      ...p,
      type: "PAIR" as const,
      id: p.initialSeat,
    })),
  };
}
