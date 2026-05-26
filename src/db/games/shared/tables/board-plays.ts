import {
  sqliteTable,
  text,
  integer,
  primaryKey,
} from "drizzle-orm/sqlite-core";
import { BoardStatuses } from "../../types/board-status";

export const boardPlays = sqliteTable(
  "boardplays",
  {
    roundNumber: integer("round_number"),
    tableNumber: integer("table_number"),
    boardNumber: integer("board_number"),
    status: text("status", {
      enum: BoardStatuses,
    }),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.roundNumber, table.tableNumber, table.boardNumber],
    }),
  }),
);

export type BoardPlay = typeof boardPlays.$inferSelect;
