import "server-only";

import { createDb, getDb } from "@/db/games";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { sections } from "@/db/games/tables/sections";

/**
 * Create and migrate a per-game database, seeding a single default section "A".
 * Every game has at least one section; the director can add/rename/resize more
 * (and set a movement per section) before the game starts.
 *
 * @param tables  Initial table count for the default section (defaults to 1).
 */
export async function createGameDb(gameId: string, tables = 1) {
  if (await getDb(gameId)) {
    throw new Error("Database already exists");
  }

  const db = await createDb(gameId);

  migrate(db, {
    migrationsFolder: "./drizzle/games",
  });

  db.insert(sections)
    .values({
      section: "A",
      label: "A",
      tables,
      selectedMovement: null,
      ordinal: 0,
    })
    .run();
}
