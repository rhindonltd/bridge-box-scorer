import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";

/* events */
export const events = sqliteTable("events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  eventName: text("event_name").notNull(),
  eventDate: text("event_date").notNull(), // SQLite DATETIME stored as text
  director: text("director"),
  eventType: text("event_type"),
  createdAt: text("created_at").notNull(),
});

export type BridgeEvent = typeof events.$inferSelect;
export type NewBridgeEvent = typeof events.$inferInsert;

/* sessions */
export const sessions = sqliteTable("sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  eventId: integer("event_id")
    .references(() => events.id)
    .notNull(),
  sessionName: text("session_name").notNull(),
});

export type BridgeSession = typeof sessions.$inferSelect;
export type NewBridgeSession = typeof sessions.$inferInsert;

/* sections */
export const sections = sqliteTable("sections", {
  id: text("id").notNull(),
  sessionId: integer("session_id").references(() => sessions.id),
  sectionName: text("section_name").notNull(),
  status: text().notNull(), // CREATED, MOVEMENT_SET, RUNNING, FINALISED, UPLOADED,
  gameDb: text().notNull(),
}, (table) => ({
    pk: primaryKey({
        columns: [table.id],
    }),
}),);

export type BridgeSection = typeof sections.$inferSelect;
