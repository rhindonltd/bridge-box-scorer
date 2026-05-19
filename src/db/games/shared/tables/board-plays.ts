import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const boardPlays = sqliteTable("boardplays", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  roundNumber: integer("round_number"),
  tableNumber: integer("table_number"),
  boardNumber: integer("board_number"),
  status: text("status"), // "NOT_PLAYED", "PENDING_CONFIRMATION", "CONFIRMED", "OVERRIDDEN"
});

export type BoardPlay = typeof boardPlays.$inferSelect;
