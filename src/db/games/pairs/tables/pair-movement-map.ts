import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { pairs } from "@/db/games/pairs/tables/pairs";

export const pairMovementMap = sqliteTable("playermovementmap", {
  id: text("id").primaryKey(),
  pair: integer("pair").references(() => pairs.id),
});

export type PairMovementMap = typeof pairMovementMap.$inferSelect;
