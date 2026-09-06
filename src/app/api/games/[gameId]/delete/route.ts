import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { games } from "@/db/game-index/schema";
import { getDb as getIndexDb } from "@/db/game-index";
import { withDirectorRoute } from "@/lib/api/directorRoute";
import { success } from "@/lib/api/success";

export const DELETE = withDirectorRoute(async ({ gameId }) => {
  // The game row lives in the game-index database, NOT the per-game database
  // that `withDirectorRoute`/`withGameRoute` resolves. Delete it from the
  // index, then remove the per-game SQLite file from disk.
  const indexDb = getIndexDb();
  await indexDb.delete(games).where(eq(games.gameId, gameId));

  const dbFile = path.join(
    process.env.DATABASE_GAMES_URL ?? "/home/bridgebox/data/games",
    `${gameId}.db`,
  );

  if (fs.existsSync(dbFile)) {
    fs.unlinkSync(dbFile);
  }

  return success({});
});
