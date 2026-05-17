import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const players = sqliteTable("players", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  firstName: text("first_name"),
  lastName: text("last_name"),
  nationalId: text("national_id"),
});

export type Player = typeof players.$inferSelect;
