import {
  sqliteTable,
  text,
  integer,
  primaryKey,
} from "drizzle-orm/sqlite-core";
import { BoardStatuses } from "@/db/games/types/board-status";
import { BoardOutcome } from "@/model/score";
import { Card } from "@/model/common";
import { matches } from "@/db/games/tables/matches";

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
    // The match this board belongs to (FK → matches.id). Every board belongs to
    // exactly one match: its structural/seating record. The match row is
    // authoritative for "which participants met over which boards in which
    // round"; this board row holds only the per-board result. Written at
    // materialisation (in the same transaction as the board insert); never
    // written by the player submit/confirm path. See docs/design/matches-table.md.
    matchId: integer("match_id")
      .notNull()
      .references(() => matches.id),
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
