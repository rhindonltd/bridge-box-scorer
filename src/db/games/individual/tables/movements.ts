import { sqliteTable, integer, primaryKey } from "drizzle-orm/sqlite-core";

export const movements = sqliteTable(
  "movements",
  {
    roundNumber: integer("round_number"),
    tableNumber: integer("table_number"),
    n: integer("n"),
    s: integer("s"),
    e: integer("e"),
    w: integer("w"),
    startBoard: integer("start_board"),
    endBoard: integer("end_board"),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.roundNumber, table.tableNumber],
    }),
  }),
);

export type IndividualMovement = typeof movements.$inferSelect;
