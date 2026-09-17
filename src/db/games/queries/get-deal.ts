import "server-only";

import { eq } from "drizzle-orm";
import type { Db } from "@/db/games";
import { deals, DealRow } from "@/db/games/tables/deals";
import { Deal } from "@/model/common";
import { parsePbn } from "@/model/deal";

/**
 * Read the stored deal row for a single board number, or null when none has
 * been entered yet. Returns the raw row (PBN string + provenance); callers that
 * need the parsed hands use {@link getDealHands}.
 */
export async function getDealRow(
  db: Db,
  boardNumber: number,
): Promise<DealRow | null> {
  const row = await db
    .select()
    .from(deals)
    .where(eq(deals.boardNumber, boardNumber))
    .get();

  return row ?? null;
}

/**
 * Read a board's deal parsed into the four hands, or null when none exists.
 * Stored PBN is always a complete deal (validated on write), so parsing is
 * safe.
 */
export async function getDealHands(
  db: Db,
  boardNumber: number,
): Promise<Deal | null> {
  const row = await getDealRow(db, boardNumber);
  return row ? parsePbn(row.pbn) : null;
}

/**
 * Read every stored deal for the game as a map from board number to parsed
 * hands. Used by the USEBIO export to attach deals to board groups in one read.
 */
export async function getAllDealHands(
  db: Db,
): Promise<Map<number, Deal>> {
  const rows = await db.select().from(deals);
  const map = new Map<number, Deal>();
  for (const row of rows) {
    map.set(row.boardNumber, parsePbn(row.pbn));
  }
  return map;
}
