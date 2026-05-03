import type { Config } from "drizzle-kit";

export default {
    schema: "./src/db/game-index/schema.ts",
    out: "./drizzle/game-index",
    dialect: "sqlite",
    dbCredentials: {
        url: "./data/game-index.db",
    },
} satisfies Config;
