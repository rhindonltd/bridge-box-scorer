import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { GameTypes } from "@/db/games/types/game-type";

export const games = sqliteTable("games", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  eventName: text("event_name").notNull(),
  director: text("director"),
  gameType: text("game_type", {
    enum: GameTypes,
  }).notNull(),
  gameId: text("game_id")
    .notNull()
    .default(sql`(lower(hex(randomblob(16))))`),
  sessionName: text("session_name").notNull(),
  sectionName: text("section_name").notNull(),
  eventDate: text("event_date").notNull(),
  tables: integer("tables").notNull(),
  status: text().notNull().default("CREATED"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export type BridgeGame = typeof games.$inferSelect;
export type NewBridgeGame = typeof games.$inferInsert;
