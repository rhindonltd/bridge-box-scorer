import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/games/individual/schema.ts",
  out: "./drizzle/games/individual",
  dialect: "sqlite",
} satisfies Config;
