import { findIndividuals } from "@/db/games/individual/queries/find-individuals";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ gameId: string }> },
) {
  const gameId = (await params).gameId;

  try {
    return NextResponse.json(await findIndividuals(gameId));
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
