import { NextResponse } from "next/server";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { getBoardInstances } from "@/services/board-service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ gameId: string; boardNumber: string }> },
) {
  const { gameId, boardNumber } = await params;

  try {
    const game = await findGameById(gameId);
    if (!game) {
      return NextResponse.json(
        { success: false, error: "Game not found" },
        { status: 404 },
      );
    }

    const instances = await getBoardInstances(gameId, Number(boardNumber));
    return NextResponse.json({ success: true, instances });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
