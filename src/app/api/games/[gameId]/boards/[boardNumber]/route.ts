import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { getDb as getPairsDb } from "@/db/games/pairs";
import { getDb as getIndividualDb } from "@/db/games/individual";
import { boards as pairsBoards } from "@/db/games/pairs/tables/boards";
import { boards as individualBoards } from "@/db/games/individual/tables/boards";
import { findPairs } from "@/db/games/pairs/queries/find-pairs";
import { findIndividuals } from "@/db/games/individual/queries/find-individuals";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ gameId: string; boardNumber: string }> },
) {
  const { gameId, boardNumber } = await params;
  const boardNum = Number(boardNumber);

  try {
    const game = await findGameById(gameId);
    if (!game) {
      return NextResponse.json(
        { success: false, error: "Game not found" },
        { status: 404 },
      );
    }

    if (game.gameType === "INDIVIDUAL") {
      const db = await getIndividualDb(gameId);
      const records = await db
        .select()
        .from(individualBoards)
        .where(eq(individualBoards.boardNumber, boardNum));

      // Get player names
      const individuals = await findIndividuals(gameId);
      const playerNameMap = new Map<string, string>();
      for (const ind of individuals) {
        playerNameMap.set(
          ind.initialSeat,
          `${ind.player.firstName} ${ind.player.lastName}`,
        );
      }

      const instances = records.map((b) => ({
        roundNumber: b.roundNumber,
        tableNumber: b.tableNumber,
        boardNumber: b.boardNumber,
        participants: {
          type: "INDIVIDUAL" as const,
          n: b.n,
          s: b.s,
          e: b.e,
          w: b.w,
          nName: playerNameMap.get(b.n) ?? null,
          sName: playerNameMap.get(b.s) ?? null,
          eName: playerNameMap.get(b.e) ?? null,
          wName: playerNameMap.get(b.w) ?? null,
        },
        currentResult: b.directorOverrideResult ?? b.confirmedResult ?? null,
        status: b.status ?? null,
      }));

      return NextResponse.json({ instances });
    } else {
      const db = await getPairsDb(gameId);
      const records = await db
        .select()
        .from(pairsBoards)
        .where(eq(pairsBoards.boardNumber, boardNum));

      // Get pair names
      const pairs = await findPairs(gameId);
      const pairNameMap = new Map<string, string>();
      for (const pair of pairs) {
        const names = `${pair.player1.firstName} ${pair.player1.lastName} & ${pair.player2.firstName} ${pair.player2.lastName}`;
        pairNameMap.set(pair.initialSeat, names);
      }

      const instances = records.map((b) => ({
        roundNumber: b.roundNumber,
        tableNumber: b.tableNumber,
        boardNumber: b.boardNumber,
        participants: {
          type: "PAIRS" as const,
          ns: b.ns,
          ew: b.ew,
          nsNames: pairNameMap.get(b.ns) ?? null,
          ewNames: pairNameMap.get(b.ew) ?? null,
        },
        currentResult: b.directorOverrideResult ?? b.confirmedResult ?? null,
        status: b.status ?? null,
      }));

      return NextResponse.json({ instances });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
