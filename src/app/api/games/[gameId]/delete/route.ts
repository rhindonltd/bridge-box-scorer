import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { games } from "@/db/game-index/schema";
import { getDb as getIndexDb } from "@/db/game-index";
import { withDirectorRoute } from "@/lib/api/directorRoute";
import { success } from "@/lib/api/success";
import { broadcastGameDeleted } from "@/socket/broadcast/game-deleted-broadcast";

export const DELETE = withDirectorRoute(async ({ gameId }) => {
  // Tell everyone currently viewing this game (players, director, room
  // displays) that it is gone, so their screens show "not found" live. Emitted
  // BEFORE the row/db are removed — the emit only needs the room name, and
  // doing it first means the notification can't be lost if deletion throws.
  broadcastGameDeleted(gameId);

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
