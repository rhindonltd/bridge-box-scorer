import {
  sqliteTable,
  text,
  integer,
  primaryKey,
} from "drizzle-orm/sqlite-core";
import { BoardStatuses } from "@/db/games/types/board-status";

export const boards = sqliteTable(
  "boards",
  {
    roundNumber: integer("round_number"),
    tableNumber: integer("table_number"),
    boardNumber: integer("board_number"),
    n: text("n"),
    s: text("s"),
    e: text("e"),
    w: text("w"),
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

export type Board = typeof boards.$inferSelect;
