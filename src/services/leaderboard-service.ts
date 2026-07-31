"use server";

import { getDb as getPairsDb } from "@/db/games/pairs";
import { getDb as getIndividualDb } from "@/db/games/individual";
import { boards as pairsBoards } from "@/db/games/pairs/tables/boards";
import { boards as individualBoards } from "@/db/games/individual/tables/boards";
import { findPairs } from "@/db/games/pairs/queries/find-pairs";
import { findIndividuals } from "@/db/games/individual/queries/find-individuals";
import { score, ScoredTraveller, ScoredTravellerOfType } from "@/scoring/traveller/score-traveller";
import { PairTraveller, IndividualTraveller } from "@/model/traveller";
import { calculateOverallMPResults } from "@/scoring/overall/pair/mp";
import { calculateOverallXIMPResults as calculatePairXIMPResults } from "@/scoring/overall/pair/x-imp";
import { calculateOverallMPResults as calculateIndividualMPResults } from "@/scoring/overall/individual/mp";
import { calculateOverallXIMPResults as calculateIndividualXIMPResults } from "@/scoring/overall/individual/x-imp";
import { BoardOutcome, ScoringMode } from "@/model/score";
import { BridgeGame } from "@/db/game-index/schema";

export async function computeLeaderboard(game: BridgeGame) {
  const scoringMode: ScoringMode =
    game.scoringType === "IMP" || game.scoringType === "XIMP" ? "XIMP" : "MP";

  if (game.gameType === "PAIRS") {
    return computePairsLeaderboard(game.gameId, scoringMode);
  } else {
    return computeIndividualLeaderboard(game.gameId, scoringMode);
  }
}

async function computePairsLeaderboard(gameId: string, scoringMode: ScoringMode) {
  const db = await getPairsDb(gameId);
  const allBoardRows = await db.select().from(pairsBoards);

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
        outcome: (r.directorOverrideResult ?? r.confirmedResult) as BoardOutcome,
      })),
    };

    travellers.push(score(pairTraveller, scoringMode));
  }

  const overallScore = scoringMode === "MP"
    ? calculateOverallMPResults(travellers as ScoredTravellerOfType<"PAIR_MP">[])
    : calculatePairXIMPResults(travellers as ScoredTravellerOfType<"PAIR_XIMP">[]);

  const pairs = await findPairs(gameId);
  const participants = pairs.map((p) => ({ ...p, type: "PAIR" as const, id: p.initialSeat }));

  return { type: overallScore.type, overallScore, participants };
}

async function computeIndividualLeaderboard(gameId: string, scoringMode: ScoringMode) {
  const db = await getIndividualDb(gameId);
  const allBoardRows = await db.select().from(individualBoards);

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

    const individualTraveller: IndividualTraveller = {
      type: "INDIVIDUAL",
      mode: "INDIVIDUAL",
      board: boardNumber,
      section: gameId,
      lines: linesWithResults.map((r) => ({
        nId: r.n,
        sId: r.s,
        eId: r.e,
        wId: r.w,
        outcome: (r.directorOverrideResult ?? r.confirmedResult) as BoardOutcome,
      })),
    };

    travellers.push(score(individualTraveller, scoringMode));
  }

  const overallScore = scoringMode === "MP"
    ? calculateIndividualMPResults(travellers as ScoredTravellerOfType<"INDIVIDUAL_MP">[])
    : calculateIndividualXIMPResults(travellers as ScoredTravellerOfType<"INDIVIDUAL_XIMP">[]);

  const individuals = await findIndividuals(gameId);
  const participants = individuals.map((p) => ({ ...p, type: "INDIVIDUAL" as const, id: p.initialSeat }));

  return { type: overallScore.type, overallScore, participants };
}
