import { players } from "@/db/games/shared/tables/players";
import {
  sqliteTable,
  text,
  integer,
  primaryKey,
} from "drizzle-orm/sqlite-core";

export const startingPositions = sqliteTable(
  "startingpositions",
  {
    tableNumber: integer("table_number"),
    direction: text("direction"),
    player: integer("player").references(() => players.id),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.tableNumber, table.direction],
    }),
  }),
);

export type StartingPositions = typeof startingPositions.$inferSelect;
