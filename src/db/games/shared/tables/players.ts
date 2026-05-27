import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const players = sqliteTable("players", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  nationalId: text("national_id"),
});

export type NewPlayer = typeof players.$inferInsert;
export type Player = typeof players.$inferSelect;
