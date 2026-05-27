import { players } from "@/db/games/shared/tables/players";
import { Directions } from "@/model/common";
import {
  sqliteTable,
  text,
  integer,
  primaryKey,
} from "drizzle-orm/sqlite-core";

export const initialSeat = sqliteTable(
  "initialseat",
  {
    tableNumber: integer("table_number").notNull(),
    direction: text("direction", {
      enum: Directions,
    }).notNull(),
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

export type InitialSeat = typeof initialSeat.$inferSelect;
