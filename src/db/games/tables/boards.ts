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
    copy: text("copy").notNull().default("A"),
    ns: text("ns").notNull(),
    ew: text("ew").notNull(),
    confirmedResult: text("confirmed_result").$type<BoardOutcome>(),
    confirmedLead: text("confirmed_lead").$type<Card>(),
    directorOverrideResult: text(
      "director_override_result",
    ).$type<BoardOutcome>(),
    directorOverrideLead: text("director_override_lead").$type<Card>(),
    // A MATCH-LEVEL director ruling token that is NOT a board score, so it is
    // kept separate from `confirmedResult`/`directorOverrideResult` (which the
    // scoring field reads). Currently carries the EBU §3.5 mismatch ruling
    // (`MM:<side>:<direction>:<fault>`, see `model/swiss-mismatch.ts`) stamped
    // across every board row of a MISMATCH match: the board keeps its real
    // played result in the field, and the Swiss VP scorers read this column to
    // apply the §3.5.2 one-sided VP adjustment.
    matchRuling: text("match_ruling").$type<string>(),
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
