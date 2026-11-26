import "server-only";
import { requireGameDb } from "@/db/games";
import { NewPlayer, players } from "@/db/games/tables/players";
import {
  seatOccupancy,
  type SeatOccupancy,
} from "@/db/games/tables/seat-occupancy";
import {
  chooseHandover,
  newPairBoards,
  returningPairBoards,
  teamHandoverRejection,
} from "@/modules/rulings";
import { splitSeatBoardsByResult } from "@/db/games/queries/seat-board-results";
import { PairSeat, parseSeat, seatFor } from "@/model/participants";
import { eq, inArray } from "drizzle-orm";

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
 * The rules (who the seat is taken from, the teams roster limit, and the board
 * split derived from the results already entered) are in `@/modules/rulings`
 * (`chooseHandover`, `teamHandoverRejection`, `newPairBoards`,
 * `returningPairBoards`). This action reads the seat, applies them, and writes
 * the result.
 *
 * For a NEW pair, in one transaction:
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
 * A RETURNING pair (one that played this seat earlier) reuses its existing
 * occupancy (see {@link returnPairToSeat}).
 *
 * Rejections are returned, not thrown, so the handler can surface them.
 */
export async function handoverSeat(
  gameId: string,
  data: {
    seat: PairSeat;
    realPair: { player1: NewPlayer; player2: NewPlayer };
    secretKey: string;
    /**
     * Whether this is a TEAMS game. A team is the NS and EW pairs of one home
     * table, so a teams handover is also checked against the team's total pair
     * count (`MAX_PAIRS_PER_TEAM`). Omitted/false for pairs, where the NS and
     * EW pairs at a table are unrelated contestants.
     */
    teamsGame?: boolean;
  },
): Promise<HandoverResult> {
  const db = await requireGameDb(gameId);
  const seat = data.seat;

  // The seat's current occupancies, and the players who have sat it (to
  // recognise a returning pair).
  const existing = await db
    .select()
    .from(seatOccupancy)
    .where(eq(seatOccupancy.seat, seat));
  const playerRows =
    existing.length === 0
      ? []
      : await db
          .select()
          .from(players)
          .where(
            inArray(
              players.id,
              existing.flatMap((o) => [o.player1, o.player2]),
            ),
          );
  const playerById = new Map(playerRows.map((p) => [p.id, p]));

  const choice = chooseHandover(existing, playerById, data.realPair);
  if (!choice.ok) return choice;
  if (choice.kind === "returningPair") {
    return returnPairToSeat(
      db,
      seat,
      choice.leaving,
      choice.returning,
      data.secretKey,
    );
  }

  if (data.teamsGame) {
    const { section, tableNumber, direction } = parseSeat(seat);
    const partnerSeat = seatFor(
      section,
      tableNumber,
      direction === "NS" ? "EW" : "NS",
    );
    const partnerOccupancies = await db
      .select({ id: seatOccupancy.id })
      .from(seatOccupancy)
      .where(eq(seatOccupancy.seat, partnerSeat));
    const rejection = teamHandoverRejection(
      existing.length,
      partnerOccupancies.length,
    );
    if (rejection) return rejection;
  }

  const { standIn } = choice;
  const boardAnchorId = standIn.anchorId ?? seat;
  const split = newPairBoards(await splitSeatBoardsByResult(db, boardAnchorId));
  if (!split.ok) return split;

  db.transaction((tx) => {
    // 1. Pin the EARLIER occupant to the boards it actually played, and mark it
    //    NOT the arrival anchor (it is being handed over FROM). It stays ACTIVE
    //    and the seat stays one line (split = 0) — the director decides standing
    //    / split later on the Substitutions screen. Rotate its secret so its old
    //    device token can no longer authenticate the live seat (the arriving
    //    pair now holds it). (`secretKey` is NOT NULL, so overwrite not null.)
    tx.update(seatOccupancy)
      .set({
        boards: split.standInBoards,
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
    const p1 = tx
      .insert(players)
      .values(data.realPair.player1)
      .returning()
      .get();
    const p2 = tx
      .insert(players)
      .values(data.realPair.player2)
      .returning()
      .get();
    tx.insert(seatOccupancy)
      .values({
        seat,
        anchorId: standIn.anchorId,
        boards: split.arrivingBoards,
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

type Db = Awaited<ReturnType<typeof requireGameDb>>;

/**
 * A pair that played this seat earlier comes BACK IN (the original pair after a
 * substitute, or the substitute again). No new occupancy is created; the board
 * split is `returningPairBoards` in `@/modules/rulings`. That keeps the seat at
 * one substitute, a team within six players, and the pair's identity (and
 * USEBIO pair number) the same on every board it plays.
 *
 * In one transaction:
 *   - the returning occupancy gains the unplayed boards, becomes the ARRIVAL
 *     ANCHOR (it holds the live device) and takes the new `secretKey`;
 *   - the leaving occupancy keeps only the boards it already played, stops
 *     being the anchor, and has its secret rotated so its old device stops
 *     working;
 *   - if the leaving pair never played a board, its occupancy is removed and
 *     the returning pair is restored as the seat's single whole-seat occupant,
 *     as if no handover had happened.
 *
 * The director's Substitutions choices (split, main pair, eligibility) are left
 * alone, except in the collapse case where they no longer apply.
 */
async function returnPairToSeat(
  db: Db,
  seat: PairSeat,
  leaving: SeatOccupancy,
  returning: SeatOccupancy,
  secretKey: string,
): Promise<HandoverResult> {
  const boardAnchorId = leaving.anchorId ?? seat;
  const split = returningPairBoards(
    leaving.boards,
    returning.boards,
    await splitSeatBoardsByResult(db, boardAnchorId),
  );
  if (!split.ok) return split;

  db.transaction((tx) => {
    if (split.collapse) {
      tx.delete(seatOccupancy).where(eq(seatOccupancy.id, leaving.id)).run();
      tx.update(seatOccupancy)
        .set({
          boards: null,
          standing: "ACTIVE",
          isArrivalAnchor: 0,
          isMainLine: 0,
          split: 0,
          secretKey,
        })
        .where(eq(seatOccupancy.id, returning.id))
        .run();
      return;
    }
    tx.update(seatOccupancy)
      .set({
        boards: split.leavingKeeps,
        isArrivalAnchor: 0,
        secretKey: crypto.randomUUID(),
      })
      .where(eq(seatOccupancy.id, leaving.id))
      .run();
    tx.update(seatOccupancy)
      .set({ boards: split.returningBoards, isArrivalAnchor: 1, secretKey })
      .where(eq(seatOccupancy.id, returning.id))
      .run();
  });
  return { ok: true };
}
