import { NextResponse } from "next/server";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ gameId: string }> },
) {
  const gameId = (await params).gameId;

  try {
      const game = await findGameById(gameId);
      if (!game) {
          return NextResponse.json(
              { success: false, error: "Game not found" },
              { status: 404 },
          );
      }

      return NextResponse.json({ success: true, game });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
