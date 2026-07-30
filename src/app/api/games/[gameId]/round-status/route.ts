import { NextResponse } from "next/server";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { getDb as getPairsDb } from "@/db/games/pairs";
import { getDb as getIndividualDb } from "@/db/games/individual";
import { boards as pairsBoards } from "@/db/games/pairs/tables/boards";
import { boards as individualBoards } from "@/db/games/individual/tables/boards";
import { computeRoundStatus, isBoardEntered, BoardEntry } from "@/lib/round-status";

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

    let entries: BoardEntry[];

    if (game.gameType === "INDIVIDUAL") {
      const db = await getIndividualDb(gameId);
      const rows = await db.select().from(individualBoards);
      entries = rows.map((row) => ({
        roundNumber: row.roundNumber,
        tableNumber: row.tableNumber,
        boardNumber: row.boardNumber,
        hasResult: isBoardEntered({
          nResult: row.nResult,
          directorOverrideResult: row.directorOverrideResult,
          status: row.status,
        }),
      }));
    } else {
      const db = await getPairsDb(gameId);
      const rows = await db.select().from(pairsBoards);
      entries = rows.map((row) => ({
        roundNumber: row.roundNumber,
        tableNumber: row.tableNumber,
        boardNumber: row.boardNumber,
        hasResult: isBoardEntered({
          nsResult: row.nsResult,
          directorOverrideResult: row.directorOverrideResult,
          status: row.status,
        }),
      }));
    }

    const tables = computeRoundStatus(entries);
    return NextResponse.json({ tables });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
