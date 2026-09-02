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
    section: text("section").notNull(),
    roundNumber: integer("round_number").notNull(),
    tableNumber: integer("table_number").notNull(),
    boardNumber: integer("board_number").notNull(),
    ns: text("ns").notNull(),
    ew: text("ew").notNull(),
    confirmedResult: text("confirmed_result").$type<BoardOutcome>(),
    confirmedLead: text("confirmed_lead").$type<Card>(),
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
      columns: [
        table.section,
        table.roundNumber,
        table.tableNumber,
        table.boardNumber,
      ],
    }),
  }),
);

export type NewBoard = typeof boards.$inferInsert;
export type Board = typeof boards.$inferSelect;
