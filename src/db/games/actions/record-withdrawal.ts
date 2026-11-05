import "server-only";

import { and, eq, gte, isNull, or } from "drizzle-orm";
import { requireGameDb } from "@/db/games";
import { boards } from "@/db/games/tables/boards";
import { boardSubmissions } from "@/db/games/tables/submissions";
import { seatOccupancy } from "@/db/games/tables/seat-occupancy";
import { arrivalAnchorOf } from "@/db/games/queries/seat-occupancy";
import type { PairSeat } from "@/model/participants";

export interface RecordWithdrawalResult {
  ok: boolean;
  /** When !ok, a user-facing reason. */
  error?: string;
  /** The board rows marked ABSENT. */
  absentBoards?: number;
}

/**
 * Design §11 — a PAIRS pair withdraws itself from `fromRound` onward.
 *
 * In one transaction:
 *   1. The occupancy playing the seat now is marked WITHDRAWN in `fromRound`,
 *      and its secret is rotated so the device's old token can no longer
 *      authenticate the seat. Its treatment is left as the director's choice;
 *      unset reads as AVERAGE.
 *   2. Every board row of the seat with no result, in rounds ≥ `fromRound`, is
 *      marked ABSENT — it will not be played. Rows that already have a result
 *      (confirmed or director-set) are untouched.
 *   3. Any pending one-sided submission on those rows is discarded, so the
 *      opponent is not left waiting for a confirmation that cannot come.
 *
 * Rejected (returned, not thrown) when nobody is seated there, the pair has
 * already withdrawn, or it has nothing left to play.
 */
export async function recordWithdrawal(
  gameId: string,
  seat: PairSeat,
  fromRound: number,
): Promise<RecordWithdrawalResult> {
  const db = await requireGameDb(gameId);

  const occupancies = await db
    .select()
    .from(seatOccupancy)
    .where(eq(seatOccupancy.seat, seat));
  if (occupancies.length === 0) {
    return { ok: false, error: "No pair is seated there." };
  }
  if (occupancies.some((o) => o.standing === "WITHDRAWN")) {
    return { ok: false, error: "This pair has already withdrawn." };
  }

  const current = arrivalAnchorOf(occupancies);
  const boardId = current.anchorId ?? seat;

  // The seat's rows with no result from the withdrawal round on.
  const missedRows = and(
    or(eq(boards.ns, boardId), eq(boards.ew, boardId)),
    gte(boards.roundNumber, fromRound),
    isNull(boards.confirmedResult),
    isNull(boards.directorOverrideResult),
  );
  const missed = await db
    .select({
      section: boards.section,
      roundNumber: boards.roundNumber,
      tableNumber: boards.tableNumber,
    })
    .from(boards)
    .where(missedRows);

  if (missed.length === 0) {
    return {
      ok: false,
      error: "There are no boards left for this pair to play.",
    };
  }

  db.transaction((tx) => {
    tx.update(seatOccupancy)
      .set({
        standing: "WITHDRAWN",
        withdrawnInRound: fromRound,
        // Rotate the secret so the withdrawn pair's device token is dead — it
        // can no longer authenticate the seat. Reinstating mints a fresh code
        // the returning device claims (no stale token lingers).
        secretKey: crypto.randomUUID(),
      })
      .where(eq(seatOccupancy.id, current.id))
      .run();

    tx.update(boards).set({ status: "ABSENT" }).where(missedRows).run();

    // Submissions are keyed per (section, round, table); clear those tables.
    const tables = new Map<string, (typeof missed)[number]>();
    for (const m of missed) {
      tables.set(`${m.section}|${m.roundNumber}|${m.tableNumber}`, m);
    }
    for (const m of tables.values()) {
      tx.delete(boardSubmissions)
        .where(
          and(
            eq(boardSubmissions.section, m.section),
            eq(boardSubmissions.roundNumber, m.roundNumber),
            eq(boardSubmissions.tableNumber, m.tableNumber),
          ),
        )
        .run();
    }
  });

  return { ok: true, absentBoards: missed.length };
}
