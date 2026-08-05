import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { GameTypes } from "@/db/game/types/game-type";
import { GameStatuses } from "@/db/game/types/game-status";
import { ScoringTypes } from "@/db/game/types/scoring-type";

export const games = sqliteTable("games", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  eventName: text("event_name").notNull(),
  director: text("director"),
  gameType: text("game_type", {
    enum: GameTypes,
  }).notNull(),
  scoringType: text("scoring_type", {
    enum: ScoringTypes,
  })
    .notNull()
    .default("MP"),
  gameId: text("game_id")
    .notNull()
    .default(sql`(lower(hex(randomblob(16))))`),
  sessionName: text("session_name").notNull(),
  sectionName: text("section_name").notNull(),
  eventDate: text("event_date").notNull(),
  tables: integer("tables").notNull(),
  leadCardRequired: integer("lead_card_required", { mode: "boolean" })
    .notNull()
    .default(true),
  status: text("status", {
    enum: GameStatuses,
  }).notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export type BridgeGame = typeof games.$inferSelect;
export type NewBridgeGame = typeof games.$inferInsert;
