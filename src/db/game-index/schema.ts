import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { GameTypes } from "@/db/games/types/game-type";
import { ScoringTypes } from "@/db/games/types/scoring-type";

export const games = sqliteTable("games", {
  gameId: text("game_id")
    .notNull()
    .default(sql`(lower(hex(randomblob(16))))`)
    .primaryKey(),
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
  sessionName: text("session_name").notNull(),
  sectionName: text("section_name").notNull(),
  eventDate: text("event_date").notNull(),
  tables: integer("tables").notNull(),
  // JSON-encoded SelectedMovement tagged union (see src/model/selected-movement.ts).
  // Null until the director has chosen a movement. Materialized into boards /
  // assignments only when the game is started.
  selectedMovement: text("selected_movement"),
  leadCardRequired: integer("lead_card_required", { mode: "boolean" })
    .notNull()
    .default(true),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export type BridgeGame = typeof games.$inferSelect;
export type NewBridgeGame = typeof games.$inferInsert;
