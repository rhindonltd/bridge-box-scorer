import "server-only";

import { Db } from "@/db/games";
import { boards } from "@/db/games/tables/boards";
import { findPairs } from "@/db/games/queries/find-pairs";
import { scoreBoard, ScoredBoard } from "@/scoring/traveller/score-traveller";
import { PairTraveller } from "@/model/traveller";
import { calculateOverallMPResults } from "@/scoring/overall/pair/mp";
import { calculateOverallXIMPResults as calculatePairXIMPResults } from "@/scoring/overall/pair/x-imp";
import { BoardOutcome } from "@/model/score";
import { ScoredTravellerOfType } from "@/scoring/overall/legacy-scored-traveller";
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

  const overallScore =
    scoringType === "MP"
      ? calculateOverallMPResults(
          scoredBoards as unknown as ScoredTravellerOfType<"PAIR_MP">[],
        )
      : calculatePairXIMPResults(
          scoredBoards as unknown as ScoredTravellerOfType<"PAIR_XIMP">[],
        );

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
