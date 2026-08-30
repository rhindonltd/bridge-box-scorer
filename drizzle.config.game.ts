import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/games/schema.ts",
  out: "./drizzle/games",
  dialect: "sqlite",
} satisfies Config;
