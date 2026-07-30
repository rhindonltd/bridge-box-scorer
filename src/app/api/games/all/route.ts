import { NextResponse } from "next/server";
import { findAllGames } from "@/db/game-index/queries/find-all-games";

export async function GET() {
  try {
    return NextResponse.json(await findAllGames());
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
