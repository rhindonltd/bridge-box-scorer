import {
  sqliteTable,
  text,
  integer,
  primaryKey,
} from "drizzle-orm/sqlite-core";

export const players = sqliteTable(
  "players",
  {
    ebuNumber: integer("ebu_number").notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.ebuNumber],
    }),
  }),
);

export type Player = typeof players.$inferSelect;
