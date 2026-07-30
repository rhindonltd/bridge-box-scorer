import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { getDb as getPairsDb } from "@/db/games/pairs";
import { getDb as getIndividualDb } from "@/db/games/individual";
import { boards as pairsBoards } from "@/db/games/pairs/tables/boards";
import { boards as individualBoards } from "@/db/games/individual/tables/boards";

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
        },
        currentResult: b.directorOverrideResult ?? b.nResult ?? null,
        status: b.status ?? null,
      }));

      return NextResponse.json({ instances });
    } else {
      const db = await getPairsDb(gameId);
      const records = await db
        .select()
        .from(pairsBoards)
        .where(eq(pairsBoards.boardNumber, boardNum));

      const instances = records.map((b) => ({
        roundNumber: b.roundNumber,
        tableNumber: b.tableNumber,
        boardNumber: b.boardNumber,
        participants: {
          type: "PAIRS" as const,
          ns: b.ns,
          ew: b.ew,
        },
        currentResult: b.directorOverrideResult ?? b.nsResult ?? null,
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
