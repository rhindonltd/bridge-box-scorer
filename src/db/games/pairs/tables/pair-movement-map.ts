import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { participants } from "@/db/games/pairs/tables/participants";

export const pairMovementMap = sqliteTable("playermovementmap", {
  id: text("id").primaryKey(),
  initialSeat: text("initial_seat").references(() => participants.initialSeat),
});

export type PairMovementMapEntry = typeof pairMovementMap.$inferSelect;
