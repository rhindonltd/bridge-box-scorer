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
    ns: integer("ns"),
    ew: integer("ew"),
    boardNumber: integer("board_number"),
    contract: text("contract"),
    declarer: text("declarer"),
    tricks: integer("tricks"),
    score: text("score"),
    createdAt: text("created_at"),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.roundNumber, table.tableNumber, table.boardNumber],
    }),
  }),
);

export type PairsResult = typeof results.$inferSelect;
