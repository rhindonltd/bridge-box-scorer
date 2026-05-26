import {
  sqliteTable,
  integer,
  text,
  primaryKey,
} from "drizzle-orm/sqlite-core";
import { boardPlays } from "@/db/games/shared/tables/board-plays";

export const results = sqliteTable(
  "results",
  {
    roundNumber: integer("round_number"),
    tableNumber: integer("table_number"),
    result: text("result"),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.roundNumber, table.tableNumber],
    }),
  }),
);

export type Result = typeof results.$inferSelect;
