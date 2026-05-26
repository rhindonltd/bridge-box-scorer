import { players } from "@/db/games/shared/tables/players";
import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const playerMovementMap = sqliteTable("playermovementmap", {
  id: text("id").primaryKey(),
  player: integer("player").references(() => players.id),
});

export type PlayerMovementMapEntry = typeof playerMovementMap.$inferSelect;
