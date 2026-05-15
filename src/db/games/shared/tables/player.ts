import {
  sqliteTable,
  text,
  integer,
  primaryKey,
} from "drizzle-orm/sqlite-core";

export const players = sqliteTable(
  "players",
  {
    initialTable: integer("initialTable"),
    initialDirection: text("initialDirection"),
    ebuNumber: integer("ebu_number"),
    firstName: text("first_name"),
    lastName: text("last_name"),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.initialTable, table.initialDirection],
    }),
  }),
);

export type Player = typeof players.$inferSelect;
