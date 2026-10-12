import "server-only";

import { requireGameDb } from "@/db/games";
import { boards } from "@/db/games/tables/boards";
import { NewPlayer, players } from "@/db/games/tables/players";
import { seatOccupancy } from "@/db/games/tables/seat-occupancy";
import { PairSeat } from "@/model/participants";
import { eq } from "drizzle-orm";

/** How the arriving real pair's unplayed (pre-arrival) boards are scored. */
export type HandoverTreatment = "REMOVE" | "PENALISED";

export interface HandoverResult {
  ok: boolean;
  /** When !ok, a user-facing reason the handover was rejected. */
  error?: string;
}

/**
 * EBU White Book §2.3.3 / §2.4.7 — the mid-session **stand-in → real-pair
 * handover**. The stand-in has been sitting the seat and entering results; the
 * real pair now arrives and takes the seat from the next board onward.
 *
 * The split point is DERIVED from the results already entered, not chosen by
 * the director: the stand-in keeps every board of the seat that already has a
 * result (confirmed or director-overridden) — those score normally for its
 * opponents, "without standing" for the stand-in (§2.4.9) — and the real pair
 * takes every remaining board (the ones with no result yet). This guarantees
 * the two occupancies' board sets are disjoint and jointly cover the seat, and
 * that no in-flight board is split across the handover.
 *
 * In one transaction:
 *   1. Demote the stand-in's occupancy to WITHOUT_STANDING and pin its `boards`
 *      to the exact set it played (the boards with a result), clearing any
 *      withdrawal fields (a stand-in carries no fine).
 *   2. Insert the real pair's occupancy over the complementary board set, as a
 *      §2.4.7 LATE arrival carrying the chosen treatment/fine, with fresh
 *      player rows and its own device secret.
 *
 * Because the primary-occupant pick is SEMANTIC (the occupant that is NOT
 * WITHOUT_STANDING), demoting the stand-in automatically makes the arriving
 * pair the seat's ranked primary — insert order is irrelevant.
 *
 * Rejections (returned, not thrown, so the handler can surface them):
 *   - the seat has no occupant (nobody to hand over from);
 *   - the seat already has more than one occupancy (a handover already
 *     happened — v1 supports a single handover per seat);
 *   - every board of the seat already has a result (nothing left for the real
 *     pair to play — there is no handover to record).
 */
export async function handoverSeat(
  gameId: string,
  data: {
    seat: PairSeat;
    realPair: { player1: NewPlayer; player2: NewPlayer };
    secretKey: string;
    treatment: HandoverTreatment;
    /** 0..40 fine percentage; applies to PENALISED, ignored for REMOVE. */
    finePercent?: number;
  },
): Promise<HandoverResult> {
  const db = await requireGameDb(gameId);

  const seat = data.seat;

  // The seat's current occupancies. A handover is only valid from a single
  // sitting stand-in.
  const existing = await db
    .select()
    .from(seatOccupancy)
    .where(eq(seatOccupancy.seat, seat));

  if (existing.length === 0) {
    return { ok: false, error: "No pair is seated there to hand over from." };
  }
  if (existing.length > 1) {
    return {
      ok: false,
      error: "This seat has already had a handover.",
    };
  }

  const standIn = existing[0];
  const boardAnchorId = standIn.anchorId ?? seat;

  // Every board this seat plays, split into played (has a result) vs not, from
  // the board rows carrying the seat's board id. The effective result is a
  // director override over the confirmed result (same rule the scorer uses).
  const seatRows = await db
    .select({
      ns: boards.ns,
      ew: boards.ew,
      boardNumber: boards.boardNumber,
      confirmedResult: boards.confirmedResult,
      directorOverrideResult: boards.directorOverrideResult,
    })
    .from(boards);

  const played = new Set<number>();
  const unplayed = new Set<number>();
  for (const row of seatRows) {
    if (row.ns !== boardAnchorId && row.ew !== boardAnchorId) continue;
    const hasResult =
      (row.directorOverrideResult ?? row.confirmedResult) != null;
    if (hasResult) played.add(row.boardNumber);
    else unplayed.add(row.boardNumber);
  }

  if (unplayed.size === 0) {
    return {
      ok: false,
      error: "Every board here already has a result — nothing to hand over.",
    };
  }

  const standInBoards = [...played].sort((a, b) => a - b);
  const realPairBoards = [...unplayed].sort((a, b) => a - b);
  const finePercent =
    data.treatment === "PENALISED" ? clampFinePercent(data.finePercent) : null;

  db.transaction((tx) => {
    // 1. Pin the stand-in to the boards it actually played and drop it from the
    //    ranking (§2.4.9). Clear any stale withdrawal fields.
    tx.update(seatOccupancy)
      .set({
        boards: standInBoards,
        standing: "WITHOUT_STANDING",
        withdrawnInRound: null,
        withdrawalTreatment: null,
        withdrawalFinePercent: null,
      })
      .where(eq(seatOccupancy.id, standIn.id))
      .run();

    // 2. Seat the arriving real pair over the remaining boards as a §2.4.7 LATE
    //    arrival. Copy the seat's `anchorId` so board rows still resolve to it,
    //    and carry the treatment/fine for its pre-arrival gap.
    const p1 = tx.insert(players).values(data.realPair.player1).returning().get();
    const p2 = tx.insert(players).values(data.realPair.player2).returning().get();

    tx.insert(seatOccupancy)
      .values({
        seat,
        anchorId: standIn.anchorId,
        boards: realPairBoards,
        player1: p1.id,
        player2: p2.id,
        secretKey: data.secretKey,
        standing: "LATE",
        withdrawalTreatment: data.treatment,
        withdrawalFinePercent: finePercent,
      })
      .run();
  });

  return { ok: true };
}

/** Clamp a §2.4.5 fine into the White Book's 0..40% range (default 0). */
function clampFinePercent(percent: number | undefined): number {
  if (percent == null || Number.isNaN(percent)) return 0;
  return Math.min(40, Math.max(0, Math.round(percent)));
}
