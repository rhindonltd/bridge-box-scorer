import { NextResponse } from "next/server";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { getDb as getPairsDb } from "@/db/games/pairs";
import { getDb as getIndividualDb } from "@/db/games/individual";
import { boards as pairsBoards } from "@/db/games/pairs/tables/boards";
import { boards as individualBoards } from "@/db/games/individual/tables/boards";

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

    let boardNumbers: number[];

    if (game.gameType === "INDIVIDUAL") {
      const db = await getIndividualDb(gameId);
      const result = await db
        .selectDistinct({ boardNumber: individualBoards.boardNumber })
        .from(individualBoards)
        .orderBy(individualBoards.boardNumber);
      boardNumbers = result.map((r) => r.boardNumber);
    } else {
      const db = await getPairsDb(gameId);
      const result = await db
        .selectDistinct({ boardNumber: pairsBoards.boardNumber })
        .from(pairsBoards)
        .orderBy(pairsBoards.boardNumber);
      boardNumbers = result.map((r) => r.boardNumber);
    }

    return NextResponse.json({ boards: boardNumbers });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
