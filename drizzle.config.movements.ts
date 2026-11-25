import type { Config } from "drizzle-kit";

export default {
  schema: "./src/modules/movement-catalog/storage/db/schema.ts",
  out: "./drizzle/movements",
  dialect: "sqlite",
  dbCredentials: {
    url: "./data/movements.db",
  },
} satisfies Config;
