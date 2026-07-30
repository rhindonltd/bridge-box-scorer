import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { validateDirectorToken } from "@/socket/middleware/director-auth";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { getDb as getPairsDb } from "@/db/games/pairs";
import { getDb as getIndividualDb } from "@/db/games/individual";
import { boards as pairsBoards } from "@/db/games/pairs/tables/boards";
import { boards as individualBoards } from "@/db/games/individual/tables/boards";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ gameId: string; boardNumber: string }> },
) {
  const { gameId, boardNumber } = await params;
  const body = await req.json();
  const { roundNumber, tableNumber, result, directorToken } = body;

  try {
    if (!validateDirectorToken(directorToken, gameId)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const game = await findGameById(gameId);

    if (!game) {
      return NextResponse.json(
        { success: false, error: "Game not found" },
        { status: 404 },
      );
    }

    if (game.gameType === "INDIVIDUAL") {
      const db = await getIndividualDb(gameId);
      await db
        .update(individualBoards)
        .set({
          directorOverrideResult: result,
          status: "OVERRIDDEN",
        })
        .where(
          and(
            eq(individualBoards.roundNumber, roundNumber),
            eq(individualBoards.tableNumber, tableNumber),
            eq(individualBoards.boardNumber, Number(boardNumber)),
          ),
        );
    } else {
      const db = await getPairsDb(gameId);
      await db
        .update(pairsBoards)
        .set({
          directorOverrideResult: result,
          status: "OVERRIDDEN",
        })
        .where(
          and(
            eq(pairsBoards.roundNumber, roundNumber),
            eq(pairsBoards.tableNumber, tableNumber),
            eq(pairsBoards.boardNumber, Number(boardNumber)),
          ),
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
