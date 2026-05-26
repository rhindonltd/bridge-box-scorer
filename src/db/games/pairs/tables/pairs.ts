import { sqliteTable, integer, unique } from "drizzle-orm/sqlite-core";
import { players } from "@/db/games/shared/tables/players";

export const pairs = sqliteTable(
  "pairs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    player1: integer("player1")
      .references(() => players.id)
      .notNull(),
    player2: integer("player2")
      .references(() => players.id)
      .notNull(),
  },
  (table) => ({
    uniquePair: unique().on(table.player1, table.player2),
  }),
);

export type NewPair = typeof pairs.$inferInsert;
export type Pair = typeof pairs.$inferSelect;
