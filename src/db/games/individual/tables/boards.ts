import {
  sqliteTable,
  text,
  integer,
  primaryKey,
} from "drizzle-orm/sqlite-core";
import { BoardStatuses } from "@/db/games/types/board-status";
import { BoardOutcome } from "@/model/score";
import { Card } from "@/model/common";

export const boards = sqliteTable(
  "boards",
  {
    roundNumber: integer("round_number").notNull(),
    tableNumber: integer("table_number").notNull(),
    boardNumber: integer("board_number").notNull(),
    n: text("n").notNull(),
    s: text("s").notNull(),
    e: text("e").notNull(),
    w: text("w").notNull(),
    nResult: text("n_result").$type<BoardOutcome>(),
    sResult: text("s_result").$type<BoardOutcome>(),
    eResult: text("e_result").$type<BoardOutcome>(),
    wResult: text("w_result").$type<BoardOutcome>(),
    nLead: text("n_lead").$type<Card>(),
    sLead: text("s_lead").$type<Card>(),
    eLead: text("e_lead").$type<Card>(),
    wLead: text("w_lead").$type<Card>(),
    directorOverrideResult: text(
      "director_override_result",
    ).$type<BoardOutcome>(),
    directorOverrideLead: text("director_override_lead").$type<Card>(),
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

export type NewBoard = typeof boards.$inferInsert;
export type Board = typeof boards.$inferSelect;
