import { findPairInitialSeats } from "@/db/games/pairs/queries/find-pair-initial-seats";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ gameId: string }> },
) {
  const gameId = (await params).gameId;

  try {
    return NextResponse.json(await findPairInitialSeats(gameId));
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
