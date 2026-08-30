"use server";

import { Db, getDb } from "@/db/games";
import { boards } from "@/db/games/tables/boards";
import { findPairs } from "@/db/games/queries/find-pairs";
import {
  score,
  ScoredTraveller,
  ScoredTravellerOfType,
} from "@/scoring/traveller/score-traveller";
import { PairTraveller } from "@/model/traveller";
import { calculateOverallMPResults } from "@/scoring/overall/pair/mp";
import { calculateOverallXIMPResults as calculatePairXIMPResults } from "@/scoring/overall/pair/x-imp";
import { BoardOutcome, ScoringMode } from "@/model/score";
import { BridgeGame } from "@/db/game-index/schema";

export async function computeLeaderboard(db: Db) {
  const game = await findGameById(gameId);

  const scoringMode: ScoringMode =
    game.scoringType === "IMP" || game.scoringType === "XIMP" ? "XIMP" : "MP";

  return computePairsLeaderboard(game.gameId, scoringMode);
}

async function computePairsLeaderboard(db: Db, scoringMode: ScoringMode) {
  const allBoardRows = await db.select().from(boards);

  const boardMap = new Map<number, (typeof allBoardRows)[number][]>();
  for (const row of allBoardRows) {
    const arr = boardMap.get(row.boardNumber) ?? [];
    arr.push(row);
    boardMap.set(row.boardNumber, arr);
  }

  const travellers: ScoredTraveller[] = [];
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

    travellers.push(score(pairTraveller, scoringMode));
  }

  const overallScore =
    scoringMode === "MP"
      ? calculateOverallMPResults(
          travellers as ScoredTravellerOfType<"PAIR_MP">[],
        )
      : calculatePairXIMPResults(
          travellers as ScoredTravellerOfType<"PAIR_XIMP">[],
        );

  const pairs = await findPairs(gameId);
  const participants = pairs.map((p) => ({
    ...p,
    type: "PAIR" as const,
    id: p.initialSeat,
  }));

  return { type: overallScore.type, overallScore, participants };
}
