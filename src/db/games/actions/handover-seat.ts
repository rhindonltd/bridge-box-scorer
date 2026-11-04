import "server-only";

import { requireGameDb } from "@/db/games";
import { boards } from "@/db/games/tables/boards";
import { NewPlayer, players } from "@/db/games/tables/players";
import { seatOccupancy } from "@/db/games/tables/seat-occupancy";
import { PairSeat } from "@/model/participants";
import { eq } from "drizzle-orm";

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
 *   1. Pin the EARLIER occupant to the boards it actually played and mark it NOT
 *      the arrival anchor. It stays ACTIVE — whether it (or the arriving pair)
 *      is later marked "without standing", and whether the seat is split, are
 *      director decisions on the Substitutions screen, not forced here. Its
 *      secret is rotated so its old device token can no longer authenticate the
 *      live seat.
 *   2. Insert the arriving pair over the complementary board set as the arrival
 *      ANCHOR (it holds the live device), ACTIVE, with fresh player rows and its
 *      own device secret. The seat defaults to ONE continuous line (`split = 0`).
 *
 * No scoring treatment is applied: a §2.4.7 substitution has no artificial
 * score. By default the seat is one ranked line over all its boards; the
 * director can later split it or mark either occupant ineligible.
 *
 * Rejections (returned, not thrown, so the handler can surface them):
 *   - the seat has no occupant (nobody to hand over from);
 *   - the seat already has more than one occupancy (a handover already
 *     happened — v1 supports a single handover per seat);
 *   - every board of the seat already has a result (nothing left for the
 *     arriving pair to play — there is no handover to record).
 */
export async function handoverSeat(
  gameId: string,
  data: {
    seat: PairSeat;
    realPair: { player1: NewPlayer; player2: NewPlayer };
    secretKey: string;
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

  db.transaction((tx) => {
    // 1. Pin the EARLIER occupant to the boards it actually played, and mark it
    //    NOT the arrival anchor (it is being handed over FROM). It stays ACTIVE
    //    and the seat stays one line (split = 0) — the director decides standing
    //    / split later on the Substitutions screen. Rotate its secret so its old
    //    device token can no longer authenticate the live seat (the arriving
    //    pair now holds it). (`secretKey` is NOT NULL, so overwrite not null.)
    tx.update(seatOccupancy)
      .set({
        boards: standInBoards,
        standing: "ACTIVE",
        isArrivalAnchor: 0,
        isMainLine: 0,
        split: 0,
        secretKey: crypto.randomUUID(),
        withdrawnInRound: null,
        withdrawalTreatment: null,
        withdrawalFinePercent: null,
      })
      .where(eq(seatOccupancy.id, standIn.id))
      .run();

    // 2. Seat the ARRIVING pair over the remaining boards as the arrival anchor
    //    (it holds the live device and plays the seat forward). Copy the seat's
    //    `anchorId` so board rows still resolve to it. ACTIVE + split = 0 by
    //    default → the seat is one ranked line over all its boards until the
    //    director says otherwise.
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
        standing: "ACTIVE",
        isArrivalAnchor: 1,
        isMainLine: 0,
        split: 0,
      })
      .run();
  });

  return { ok: true };
}
