import { NextResponse } from "next/server";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { getDb as getPairsDb } from "@/db/games/pairs";
import { boards as pairsBoards } from "@/db/games/pairs/tables/boards";

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

    const db = await getPairsDb(gameId);
    const result = await db
      .selectDistinct({ boardNumber: pairsBoards.boardNumber })
      .from(pairsBoards)
      .orderBy(pairsBoards.boardNumber);
    const boardNumbers = result.map((r) => r.boardNumber);

    return NextResponse.json({ boards: boardNumbers });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
