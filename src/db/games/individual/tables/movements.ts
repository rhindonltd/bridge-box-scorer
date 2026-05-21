import {
  sqliteTable,
  integer,
  primaryKey,
  text,
} from "drizzle-orm/sqlite-core";

export const movements = sqliteTable(
  "movements",
  {
    roundNumber: integer("round_number"),
    tableNumber: integer("table_number"),
    n: text("n"),
    s: text("s"),
    e: text("e"),
    w: text("w"),
    boardStart: integer("board_start"),
    boardEnd: integer("board_end"),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.roundNumber, table.tableNumber],
    }),
  }),
);

export type IndividualMovement = typeof movements.$inferSelect;
