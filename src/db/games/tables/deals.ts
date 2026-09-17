import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * The dealt cards for a board, stored once per board number.
 *
 * A deal is a property of the board NUMBER, not of a per-(section, round,
 * table) `boards` row: board N holds the same 52 cards wherever and whenever it
 * is played, and (by club convention) is identical across sections. So this
 * table is keyed by `boardNumber` alone — one row per board number for the
 * whole game.
 *
 * The four hands are stored as a single PBN deal string (see `@/model/deal`):
 * `"<Dealer>:h1 h2 h3 h4"`, hands clockwise from the (board-derived) dealer,
 * each hand `spades.hearts.diamonds.clubs` with ranks descending and a void
 * shown as an empty segment (e.g. `K65.543..AJ98754`). Only complete, valid
 * 52-card deals are ever written (callers validate via `isCompleteDeal`).
 *
 * `source` records who entered it: players enter deals after a round (first
 * entry wins), the director can enter or overwrite any board. A future
 * dealing-machine file import would write with a DIRECTOR/import source through
 * the same upsert path, needing no schema change.
 */
export const deals = sqliteTable("deals", {
  boardNumber: integer("board_number").primaryKey(),
  pbn: text("pbn").notNull(),
  source: text("source", { enum: ["PLAYER", "DIRECTOR"] }).notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export type NewDeal = typeof deals.$inferInsert;
export type DealRow = typeof deals.$inferSelect;

/** Who entered a deal. */
export type DealSource = DealRow["source"];
