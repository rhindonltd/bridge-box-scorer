import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { validateDirectorToken } from "@/socket/middleware/director-auth";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { getDb } from "@/db/game-index";
import { games } from "@/db/game-index/schema";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ gameId: string }> },
) {
  const { gameId } = await params;

  try {
    const body = await req.json();
    const { directorToken } = body;

    if (!validateDirectorToken(directorToken, gameId)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const game = await findGameById(gameId);
    if (!game) {
      return NextResponse.json(
        { success: false, error: "Game not found" },
        { status: 404 },
      );
    }

    // Delete from game-index database
    const db = getDb();
    await db.delete(games).where(eq(games.gameId, gameId));

    // Delete the game's database file from disk
    const dataDir =
      process.env.DATABASE_GAMES_URL ?? "/home/bridgebox/data/games";
    const dbFile = path.join(dataDir, `${gameId}.db`);
    if (fs.existsSync(dbFile)) {
      fs.unlinkSync(dbFile);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
