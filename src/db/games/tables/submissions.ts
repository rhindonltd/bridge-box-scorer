import {
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import { BoardOutcome } from "@/model/score";
import { Card } from "@/model/common";

export const boardSubmissions = sqliteTable(
  "board_submissions",
  {
    roundNumber: integer("round_number").notNull(),
    tableNumber: integer("table_number").notNull(),
    boardNumber: integer("board_number").notNull(),

    side: text("side", {
      enum: ["NS", "EW"],
    }).notNull(),

    result: text("result").$type<BoardOutcome>(),
    lead: text("lead").$type<Card>(),
  },
  (table) => ({
    pk: primaryKey({
      columns: [
        table.roundNumber,
        table.tableNumber,
        table.boardNumber,
        table.side,
      ],
    }),
  }),
);

export type NewBoardSubmission = typeof boardSubmissions.$inferInsert;
export type BoardSubmission = typeof boardSubmissions.$inferSelect;
