import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/system/schema.ts",
  out: "./drizzle/system",
  dialect: "sqlite",
  dbCredentials: {
    url: "./data/system.db",
  },
} satisfies Config;
