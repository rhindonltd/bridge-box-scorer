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
  sectionName: text("section_name").notNull(),
  eventDate: text("event_date").notNull(),
  tables: integer("tables").notNull(),
  // JSON-encoded SelectedMovement tagged union (see src/model/selected-movement.ts).
  // Null until the director has chosen a movement. Materialized into boards /
  // assignments only when the game is started.
  selectedMovement: text("selected_movement"),
  // BridgeWebs calendar event id this game maps to (chosen on the create page
  // when BridgeWebs is configured). Null when unset; used as `event_id` on the
  // results upload so BridgeWebs attaches results to the right calendar entry.
  bridgewebsEventId: text("bridgewebs_event_id"),
  leadCardRequired: integer("lead_card_required", { mode: "boolean" })
    .notNull()
    .default(true),
  // Whether players may manually enter the hands (the deal) at the end of a
  // round. Opt-in per game, so it defaults off.
  handEntryEnabled: integer("hand_entry_enabled", { mode: "boolean" })
    .notNull()
    .default(false),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export type BridgeGame = typeof games.$inferSelect;
export type NewBridgeGame = typeof games.$inferInsert;
