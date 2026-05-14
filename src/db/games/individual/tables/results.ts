import {
  sqliteTable,
  integer,
  primaryKey,
  text,
} from "drizzle-orm/sqlite-core";

export const results = sqliteTable(
  "results",
  {
    roundNumber: integer("round_number"),
    tableNumber: integer("table_number"),
    n: integer("n"),
    s: integer("s"),
    e: integer("e"),
    w: integer("w"),
    boardNumber: integer("board_number"),
    contract: text("contract"),
    declarer: text("declarer"),
    tricks: integer("tricks"),
    score: text("score"),
    createdAt: text("created_at"),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.roundNumber, table.boardNumber, table.tableNumber],
    }),
  }),
);

export type IndividualResult = typeof results.$inferSelect;
