import { sqliteTable, integer } from "drizzle-orm/sqlite-core";
import { players } from "@/db/games/shared/tables/players";

export const pairs = sqliteTable("pairs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  player1: integer("player1").references(() => players.id),
  player2: integer("player2").references(() => players.id),
});

export type Pair = typeof pairs.$inferSelect;
