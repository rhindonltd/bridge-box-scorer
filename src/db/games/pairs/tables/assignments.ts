import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { PairSeat } from "@/model/participants";

export const assignments = sqliteTable("assignment", {
  id: text("id").primaryKey(),
  initialSeat: text("initial_seat").$type<PairSeat>(),
});

export type Assignment = typeof assignments.$inferSelect;
