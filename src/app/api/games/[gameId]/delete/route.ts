import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { games } from "@/db/game-index/schema";
import { getDb as getIndexDb } from "@/db/game-index";
import { closeDb } from "@/db/games";
import { withDirectorEditRoute } from "@/lib/api/directorRoute";
import { success } from "@/lib/api/success";
import { broadcastGameDeleted } from "@/socket/broadcast/game-deleted-broadcast";

export const DELETE = withDirectorEditRoute(async ({ gameId }) => {
  // Tell everyone currently viewing this game (players, director, room
  // displays) that it is gone, so their screens show "not found" live. Emitted
  // BEFORE the row/db are removed — the emit only needs the room name, and
  // doing it first means the notification can't be lost if deletion throws.
  broadcastGameDeleted(gameId);

  // The game row lives in the game-index database, NOT the per-game database
  // that `withDirectorEditRoute`/`withGameRoute` resolves. Delete it from the
  // index, then remove the per-game SQLite file from disk.
  const indexDb = getIndexDb();
  await indexDb.delete(games).where(eq(games.gameId, gameId));

  // Close our connection first so SQLite doesn't recreate the side files,
  // then remove the database and its WAL (-wal) and shared-memory (-shm)
  // files. Removing only the .db would leave those two behind for good.
  closeDb(gameId);
  const dbFile = path.join(
    process.env.DATABASE_GAMES_URL ?? "/home/bridgebox/data/games",
    `${gameId}.db`,
  );
  for (const file of [dbFile, `${dbFile}-wal`, `${dbFile}-shm`]) {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  }

  return success({});
});
