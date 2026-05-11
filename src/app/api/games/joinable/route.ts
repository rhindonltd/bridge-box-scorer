import { NextResponse } from "next/server";
import { findJoinableGames } from "@/db/game-index/queries";

export async function GET() {
  try {
    return NextResponse.json(await findJoinableGames());
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
