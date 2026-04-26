import {
  sqliteTable,
  text,
  integer,
  primaryKey,
} from "drizzle-orm/sqlite-core";

export const players = sqliteTable(
  "players",
  {
    ebuNumber: integer("ebu_number"),
    firstName: text("first_name"),
    lastName: text("last_name"),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.ebuNumber],
    }),
  }),
);

export type Player = typeof players.$inferSelect;
