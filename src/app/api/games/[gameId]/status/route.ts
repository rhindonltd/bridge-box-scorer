import { NextResponse } from "next/server";
import { validateDirectorToken } from "@/socket/middleware/director-auth";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { updateGameStatus } from "@/db/game-index/actions/update-game-status";
import { GameStatuses, GameStatus } from "@/db/games/types/game-status";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ gameId: string }> },
) {
  const { gameId } = await params;

  try {
    const body = await req.json();
    const { status, directorToken } = body;

    if (!validateDirectorToken(directorToken, gameId)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    if (!GameStatuses.includes(status as GameStatus)) {
      return NextResponse.json(
        { success: false, error: "Invalid status" },
        { status: 400 },
      );
    }

    const game = await findGameById(gameId);
    if (!game) {
      return NextResponse.json(
        { success: false, error: "Game not found" },
        { status: 404 },
      );
    }

    await updateGameStatus(game.id, status as GameStatus);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
