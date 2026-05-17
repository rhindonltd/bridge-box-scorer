import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { boardPlays } from "@/db/games/shared/tables/board-plays";

export const results = sqliteTable("results", {
  boardPlayId: integer("board_play_id")
    .primaryKey()
    .references(() => boardPlays.id),
  result: text("result"),
});

export type Result = typeof results.$inferSelect;
