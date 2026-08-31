import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { games } from "@/db/game-index/schema";
import { withDirectorRoute } from "@/lib/api/directorRoute";
import { success } from "@/lib/api/success";

export const GET = withDirectorRoute(async ({ gameId, db }) => {
  await db.delete(games).where(eq(games.gameId, gameId));

  const dbFile = path.join(
    process.env.DATABASE_GAMES_URL ?? "/home/bridgebox/data/games",
    `${gameId}.db`,
  );

  if (fs.existsSync(dbFile)) {
    fs.unlinkSync(dbFile);
  }

  return success({});
});
