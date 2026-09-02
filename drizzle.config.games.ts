import type { Config } from "drizzle-kit";

/**
 * Per-game SQLite databases are created dynamically (one file per gameId) and
 * migrated at creation time via the drizzle migrator against
 * `./drizzle/games` (see src/db/games/actions/create-game.ts). This config is
 * only used by drizzle-kit to generate migration SQL from the schema; the
 * `url` is a placeholder scratch path and is not a live game database.
 */
export default {
  schema: "./src/db/games/schema.ts",
  out: "./drizzle/games",
  dialect: "sqlite",
  dbCredentials: {
    url: "./data/.games-schema-scratch.db",
  },
} satisfies Config;
