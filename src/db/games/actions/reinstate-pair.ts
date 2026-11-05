import "server-only";

import { and, eq, or } from "drizzle-orm";
import { requireGameDb } from "@/db/games";
import { boards } from "@/db/games/tables/boards";
import { seatOccupancy } from "@/db/games/tables/seat-occupancy";
import { arrivalAnchorOf } from "@/db/games/queries/seat-occupancy";
import type { PairSeat } from "@/model/participants";

export interface ReinstateResult {
  ok: boolean;
  /** When !ok, a user-facing reason. */
  error?: string;
}

/**
 * Design §11 — bring a withdrawn pair back into the event (the director undoing
 * a withdrawal, e.g. a mistaken tap or a pair that returns). Only a WITHDRAWN
 * pair can be reinstated: a late pair is already playing, and an empty
 * expected-late seat is filled through the ordinary join flow.
 *
 * It is the mirror of {@link import("./record-withdrawal").recordWithdrawal}:
 *   - the occupancy goes back to ACTIVE, clearing `withdrawnInRound` and the
 *     treatment, and taking the returning device's `secretKey`;
 *   - every board row the withdrawal marked ABSENT becomes NOT_PLAYED again, so
 *     the pair (and its opponents) can play them.
 *
 * The pair re-enters from the round the room is on through the ordinary play
 * flow — a board it genuinely can no longer reach (its opponents have moved on)
 * is simply never scored, which is the same as any unplayed board.
 */
export async function reinstatePair(
  gameId: string,
  seat: PairSeat,
  secretKey: string,
): Promise<ReinstateResult> {
  const db = await requireGameDb(gameId);

  const occupancies = await db
    .select()
    .from(seatOccupancy)
    .where(eq(seatOccupancy.seat, seat));
  if (occupancies.length === 0) {
    return { ok: false, error: "No pair is seated there." };
  }

  const withdrawn = occupancies.find((o) => o.standing === "WITHDRAWN");
  if (!withdrawn) {
    return { ok: false, error: "This pair has not withdrawn." };
  }

  const boardId = arrivalAnchorOf(occupancies).anchorId ?? seat;

  db.transaction((tx) => {
    tx.update(seatOccupancy)
      .set({
        standing: "ACTIVE",
        withdrawnInRound: null,
        withdrawalTreatment: null,
        // The returning device's fresh token becomes the seat's secret (the old
        // one was rotated away on withdrawal).
        secretKey,
      })
      .where(eq(seatOccupancy.id, withdrawn.id))
      .run();

    // Un-mark the boards the withdrawal took out of the movement.
    tx.update(boards)
      .set({ status: "NOT_PLAYED" })
      .where(
        and(
          or(eq(boards.ns, boardId), eq(boards.ew, boardId)),
          eq(boards.status, "ABSENT"),
        ),
      )
      .run();
  });

  return { ok: true };
}
