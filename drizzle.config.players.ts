import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/players/schema.ts",
  out: "./drizzle/players",
  dialect: "sqlite",
  dbCredentials: {
    url: "./data/players.db",
  },
} satisfies Config;
