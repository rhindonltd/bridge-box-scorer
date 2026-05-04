import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const games = sqliteTable("games", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  eventName: text("event_name").notNull(),
  director: text("director"),
  eventType: text("event_type"),
  sessionName: text("session_name").notNull(),
  sectionName: text("section_name").notNull(),
  eventDate: text("event_date").notNull(),
  status: text()
    .notNull()
    .$defaultFn(() => "CREATED"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export type BridgeGame = typeof games.$inferSelect;
export type NewBridgeGame = typeof games.$inferInsert;
