import { NextResponse } from "next/server";
import { findPlayerInitialSeats } from "@/db/games/shared/queries/find-player-initial-seats";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ gameId: string }> },
) {
  const gameId = (await params).gameId;

  try {
    return NextResponse.json(await findPlayerInitialSeats(gameId));
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
