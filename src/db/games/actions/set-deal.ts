import "server-only";

import { sql } from "drizzle-orm";
import type { Db } from "@/db/games";
import { deals, DealSource } from "@/db/games/tables/deals";
import { Deal } from "@/model/common";
import { dealerFor, isCompleteDeal, toPbn } from "@/model/deal";

/** Outcome of a first-wins deal insert. */
export type InsertDealResult =
  | { status: "inserted" }
  /** A deal already existed for this board — the input was NOT written. */
  | { status: "exists" };

/**
 * Store a board's deal only if none exists yet (global first-wins across all
 * sections). Used by player entry: the first player to enter board N's cards
 * sets them; later entrants are told it already exists and see it read-only.
 *
 * The deal is validated as a complete, legal 52-card deal before any write; an
 * invalid deal throws (callers should never reach here with one). The stored
 * PBN uses the board-derived dealer to anchor hand order.
 */
export async function insertDealIfAbsent(
  db: Db,
  boardNumber: number,
  deal: Deal,
): Promise<InsertDealResult> {
  if (!isCompleteDeal(deal)) {
    throw new Error(
      `Refusing to store an incomplete deal for board ${boardNumber}`,
    );
  }

  const pbn = toPbn(deal, dealerFor(boardNumber));

  const result = await db
    .insert(deals)
    .values({ boardNumber, pbn, source: "PLAYER" })
    .onConflictDoNothing({ target: deals.boardNumber });

  // better-sqlite3 reports affected rows; 0 means the row already existed.
  const changed = (result as { changes?: number }).changes ?? 0;
  return changed > 0 ? { status: "inserted" } : { status: "exists" };
}

/**
 * Insert or overwrite many boards' deals atomically (dealing-machine file
 * import). Every deal is validated up front; if any is incomplete nothing is
 * written. The writes then run in one transaction, so a failure part-way leaves
 * the table unchanged. Existing deals are always overwritten.
 */
export async function upsertDeals(
  db: Db,
  entries: { boardNumber: number; deal: Deal }[],
  source: DealSource = "DIRECTOR",
): Promise<void> {
  const rows = entries.map(({ boardNumber, deal }) => {
    if (!isCompleteDeal(deal)) {
      throw new Error(
        `Refusing to store an incomplete deal for board ${boardNumber}`,
      );
    }
    return {
      boardNumber,
      pbn: toPbn(deal, dealerFor(boardNumber)),
      source,
    };
  });

  db.transaction((tx) => {
    for (const row of rows) {
      tx.insert(deals)
        .values(row)
        .onConflictDoUpdate({
          target: deals.boardNumber,
          set: {
            pbn: row.pbn,
            source: row.source,
            updatedAt: sql`CURRENT_TIMESTAMP`,
          },
        })
        .run();
    }
  });
}

/**
 * Insert or overwrite a board's deal. Used by the director (who may correct any
 * board). Always writes the validated deal, bumping `updatedAt` on overwrite.
 * For a whole-file import use {@link upsertDeals}.
 */
export async function upsertDeal(
  db: Db,
  boardNumber: number,
  deal: Deal,
  source: DealSource = "DIRECTOR",
): Promise<void> {
  if (!isCompleteDeal(deal)) {
    throw new Error(
      `Refusing to store an incomplete deal for board ${boardNumber}`,
    );
  }

  const pbn = toPbn(deal, dealerFor(boardNumber));

  await db
    .insert(deals)
    .values({ boardNumber, pbn, source })
    .onConflictDoUpdate({
      target: deals.boardNumber,
      set: { pbn, source, updatedAt: sql`CURRENT_TIMESTAMP` },
    });
}
