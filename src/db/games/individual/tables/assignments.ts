import { IndividualSeat } from "@/model/participants";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const assignments = sqliteTable("assignment", {
  id: text("id").primaryKey(),
  initialSeat: text("initial_seat").$type<IndividualSeat>(),
});

export type Assignment = typeof assignments.$inferSelect;
