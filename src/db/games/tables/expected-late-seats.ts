import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { PairSeat } from "@/model/participants";

/**
 * EBU White Book §2.4.7 "half-table at the start" — the set of EMPTY seats a
 * director has marked as "expected late" so the game can start short.
 *
 * A marked seat is genuinely unfilled: there is NO `participants` row for it
 * yet (the real pair walks in later and is seated via the ordinary
 * create-participant flow, which removes the mark). While a seat is in this
 * table its opponents are indemnified AVE+ for the boards they cannot play
 * (see `withdrawalCreditBoards`), and the round-info screen tells them their
 * opponents are running late rather than showing a sit-out.
 *
 * Keyed by the section-qualified seat id (e.g. "A3EW") — the same id the board
 * rows and assignments carry — so the mark joins cleanly to the materialised
 * schedule without needing a participant identity.
 */
export const expectedLateSeats = sqliteTable("expected_late_seats", {
  seat: text("seat").$type<PairSeat>().primaryKey(),
});

export type ExpectedLateSeat = typeof expectedLateSeats.$inferSelect;
