import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/games/pairs/schema.ts",
  out: "./drizzle/games/pairs",
  dialect: "sqlite",
} satisfies Config;
