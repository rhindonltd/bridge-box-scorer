import { NextResponse } from "next/server";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ gameId: string }> },
) {
  const gameId = (await params).gameId;

  try {
    return NextResponse.json(await findGameById(gameId));
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
