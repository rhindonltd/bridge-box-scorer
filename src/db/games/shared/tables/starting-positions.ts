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
    tableNumber: integer("table_number").notNull(),
    direction: text("direction").notNull(),
    player: integer("player")
      .notNull()
      .references(() => players.id),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.tableNumber, table.direction],
    }),
  }),
);

export type StartingPosition = typeof startingPositions.$inferSelect;
