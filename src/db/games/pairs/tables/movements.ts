import {
  sqliteTable,
  integer,
  primaryKey,
  text,
} from "drizzle-orm/sqlite-core";

// Note: Pair Movements also contains teams movements as players move as a pair round the room.
export const movements = sqliteTable(
  "movements",
  {
    roundNumber: integer("round_number"),
    tableNumber: integer("table_number"),
    ns: text("ns"),
    ew: text("ew"),
    startBoard: integer("start_board"),
    endBoard: integer("end_board"),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.roundNumber, table.tableNumber],
    }),
  }),
);

export type PairMovement = typeof movements.$inferSelect;
