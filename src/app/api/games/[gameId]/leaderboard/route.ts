import { NextResponse } from "next/server";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { getDb as getPairsDb } from "@/db/games/pairs";
import { getDb as getIndividualDb } from "@/db/games/individual";
import { boards as pairsBoards } from "@/db/games/pairs/tables/boards";
import { boards as individualBoards } from "@/db/games/individual/tables/boards";
import { findPairs } from "@/db/games/pairs/queries/find-pairs";
import { findIndividuals } from "@/db/games/individual/queries/find-individuals";
import { score, ScoredTraveller } from "@/scoring/traveller/score-traveller";
import { PairTraveller, IndividualTraveller } from "@/model/traveller";
import { calculateOverallMPResults } from "@/scoring/overall/pair/mp";
import { calculateOverallXIMPResults as calculatePairXIMPResults } from "@/scoring/overall/pair/x-imp";
import { calculateOverallMPResults as calculateIndividualMPResults } from "@/scoring/overall/individual/mp";
import { calculateOverallXIMPResults as calculateIndividualXIMPResults } from "@/scoring/overall/individual/x-imp";
import { ScoredTravellerOfType } from "@/scoring/traveller/score-traveller";
import { BoardOutcome } from "@/model/score";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ gameId: string }> },
) {
  const { gameId } = await params;

  try {
    const game = await findGameById(gameId);
    if (!game) {
      return NextResponse.json(
        { success: false, error: "Game not found" },
        { status: 404 },
      );
    }

    const scoringMode =
      game.scoringType === "IMP" || game.scoringType === "XIMP"
        ? "XIMP"
        : "MP";

    if (game.gameType === "PAIRS") {
      const db = await getPairsDb(gameId);
      const allBoardRows = await db.select().from(pairsBoards);

      // Group by board number to build travellers
      const boardMap = new Map<number, (typeof allBoardRows)[number][]>();
      for (const row of allBoardRows) {
        const arr = boardMap.get(row.boardNumber) ?? [];
        arr.push(row);
        boardMap.set(row.boardNumber, arr);
      }

      // Build and score travellers
      const travellers: ScoredTraveller[] = [];
      for (const [boardNumber, rows] of boardMap) {
        // Only include boards that have at least one confirmed result
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

      // Compute overall scores
      let overallScore;
      if (scoringMode === "MP") {
        overallScore = calculateOverallMPResults(
          travellers as ScoredTravellerOfType<"PAIR_MP">[],
        );
      } else {
        overallScore = calculatePairXIMPResults(
          travellers as ScoredTravellerOfType<"PAIR_XIMP">[],
        );
      }

      // Get participants
      const pairs = await findPairs(gameId);
      const participants = pairs.map((p) => ({
        ...p,
        type: "PAIR" as const,
        id: p.initialSeat,
      }));

      return NextResponse.json({
        type: overallScore.type,
        overallScore,
        participants,
      });
    } else {
      // INDIVIDUAL
      const db = await getIndividualDb(gameId);
      const allBoardRows = await db.select().from(individualBoards);

      // Group by board number
      const boardMap = new Map<number, (typeof allBoardRows)[number][]>();
      for (const row of allBoardRows) {
        const arr = boardMap.get(row.boardNumber) ?? [];
        arr.push(row);
        boardMap.set(row.boardNumber, arr);
      }

      // Build and score travellers
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

      // Compute overall scores
      let overallScore;
      if (scoringMode === "MP") {
        overallScore = calculateIndividualMPResults(
          travellers as ScoredTravellerOfType<"INDIVIDUAL_MP">[],
        );
      } else {
        overallScore = calculateIndividualXIMPResults(
          travellers as ScoredTravellerOfType<"INDIVIDUAL_XIMP">[],
        );
      }

      // Get participants
      const individuals = await findIndividuals(gameId);
      const participants = individuals.map((p) => ({
        ...p,
        type: "INDIVIDUAL" as const,
        id: p.initialSeat,
      }));

      return NextResponse.json({
        type: overallScore.type,
        overallScore,
        participants,
      });
    }
  } catch (error) {
    console.error("Leaderboard computation failed:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
