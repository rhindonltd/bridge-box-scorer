import { NextResponse } from "next/server";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { getPlayerSchedule } from "@/services/schedule-service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ gameId: string; seat: string }> },
) {
  const { gameId, seat } = await params;

  try {
    const game = await findGameById(gameId);
    if (!game) {
      return NextResponse.json(
        { success: false, error: "Game not found" },
        { status: 404 },
      );
    }

    const result = await getPlayerSchedule(gameId, seat);
    if (!result) {
      return NextResponse.json(
        { success: false, error: "Assignment not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
