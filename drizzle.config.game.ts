import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/game/schema.ts",
  out: "./drizzle/game",
  dialect: "sqlite",
} satisfies Config;
