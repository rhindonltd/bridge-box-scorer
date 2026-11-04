import "server-only";

import { requireGameDb } from "@/db/games";
import { NewPlayer, players } from "@/db/games/tables/players";
import {
  seatOccupancy,
  type SeatOccupancy,
} from "@/db/games/tables/seat-occupancy";
import { arrivalAnchorOf } from "@/db/games/queries/seat-occupancy";
import { splitSeatBoardsByResult } from "@/db/games/queries/seat-board-results";
import { PairSeat, parseSeat, seatFor } from "@/model/participants";
import { eq, inArray } from "drizzle-orm";

/**
 * The most pairs a TEAM may field over an event: its two original pairs plus
 * one substitute — six players, the EBU's roster limit for a team of four. A
 * pair RETURNING to a seat it played earlier is the same occupancy (its board
 * set just grows), so a return never counts against this.
 */
export const MAX_PAIRS_PER_TEAM = 3;

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
 * RETURNING PAIR. If the arriving pair is one that already played this seat
 * earlier (recognised by {@link isSamePair}), it is NOT a new substitute: the
 * existing occupancy is reused and simply takes the unplayed boards back (see
 * {@link returnPairToSeat}). So "the original pair comes back after a
 * substitute" is just a handover whose names match — one substitute, not two.
 *
 * Rejections (returned, not thrown, so the handler can surface them):
 *   - the seat has no occupant (nobody to hand over from);
 *   - the arriving pair is the pair already playing the seat;
 *   - the seat already has a substitute and the arriving pair is a THIRD pair
 *     (a seat supports one substitute; only the pair who played it earlier can
 *     come back in);
 *   - in a TEAMS game, a NEW pair would take the team past
 *     {@link MAX_PAIRS_PER_TEAM} pairs across its two seats (six players);
 *   - every board of the seat already has a result (nothing left for the
 *     arriving pair to play — there is no handover to record).
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
     * count ({@link MAX_PAIRS_PER_TEAM}). Omitted/false for pairs, where the NS
     * and EW pairs at a table are unrelated contestants.
     */
    teamsGame?: boolean;
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

  // Is the arriving pair one that has sat this seat before? Compare against
  // every occupancy's players.
  const playerIds = existing.flatMap((o) => [o.player1, o.player2]);
  const playerRows = await db
    .select()
    .from(players)
    .where(inArray(players.id, playerIds));
  const playerById = new Map(playerRows.map((p) => [p.id, p]));
  const matches = (occ: SeatOccupancy) =>
    isSamePair(data.realPair, {
      player1: playerById.get(occ.player1),
      player2: playerById.get(occ.player2),
    });

  const current = arrivalAnchorOf(existing);
  if (matches(current)) {
    return { ok: false, error: "That pair is already playing this seat." };
  }

  const returning = existing.find((o) => o.id !== current.id && matches(o));
  if (returning) {
    return returnPairToSeat(db, seat, current, returning, data.secretKey);
  }

  if (existing.length > 1) {
    const earlier = existing.find((o) => o.id !== current.id)!;
    return {
      ok: false,
      error: `This seat already has a substitute. Only the pair who played it earlier (${pairLabel(
        playerById.get(earlier.player1),
        playerById.get(earlier.player2),
      )}) can take it back.`,
    };
  }

  // TEAMS: the team is the pair at this seat plus the pair at its partner seat
  // (same table, opposite direction). Reject once the team already fields the
  // maximum number of pairs, so its roster never exceeds six players.
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
    if (existing.length + partnerOccupancies.length >= MAX_PAIRS_PER_TEAM) {
      return {
        ok: false,
        error:
          "This team already has a substitute. A team can have at most six players.",
      };
    }
  }

  const standIn = existing[0];
  const boardAnchorId = standIn.anchorId ?? seat;

  // Every board this seat plays, split into played (has a result) vs not.
  const { played, unplayed } = await splitSeatBoardsByResult(db, boardAnchorId);

  if (unplayed.length === 0) {
    return {
      ok: false,
      error: "Every board here already has a result — nothing to hand over.",
    };
  }

  const standInBoards = played;
  const realPairBoards = unplayed;

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

type Db = Awaited<ReturnType<typeof requireGameDb>>;

/** The parts of a player used to recognise them again. */
type PlayerIdentity = Pick<NewPlayer, "firstName" | "lastName" | "nationalId">;

/** Lower-cased, trimmed, single-spaced — so "  ann  SMITH" matches "Ann Smith". */
function normalise(text: string | null | undefined): string {
  return (text ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Whether two player records are the same person: by EBU number when BOTH
 * carry one, otherwise by first + last name (case and spacing ignored).
 */
function isSamePlayer(a: PlayerIdentity, b: PlayerIdentity): boolean {
  const idA = normalise(a.nationalId);
  const idB = normalise(b.nationalId);
  if (idA && idB) return idA === idB;
  return (
    normalise(a.firstName) === normalise(b.firstName) &&
    normalise(a.lastName) === normalise(b.lastName)
  );
}

/**
 * Whether the arriving pair is the same partnership as a recorded one, in
 * either seat order (North/South entered the other way round still matches).
 * A recorded side with a missing player never matches.
 */
export function isSamePair(
  arriving: { player1: PlayerIdentity; player2: PlayerIdentity },
  recorded: {
    player1: PlayerIdentity | undefined;
    player2: PlayerIdentity | undefined;
  },
): boolean {
  const { player1: r1, player2: r2 } = recorded;
  if (!r1 || !r2) return false;
  const { player1: a1, player2: a2 } = arriving;
  return (
    (isSamePlayer(a1, r1) && isSamePlayer(a2, r2)) ||
    (isSamePlayer(a1, r2) && isSamePlayer(a2, r1))
  );
}

/** "First Last & First Last" for an error message. */
function pairLabel(
  p1: PlayerIdentity | undefined,
  p2: PlayerIdentity | undefined,
): string {
  return [p1, p2]
    .filter((p): p is PlayerIdentity => p != null)
    .map((p) => `${p.firstName} ${p.lastName}`.trim())
    .join(" & ");
}

/**
 * A pair that played this seat earlier comes BACK IN (the original pair after a
 * substitute, or the substitute again). No new occupancy is created: the
 * returning pair's existing occupancy takes every board with no result yet, so
 * its board set may become non-contiguous (e.g. 1–2 and 5–6). That keeps the
 * seat at one substitute, a team within six players, and the pair's identity
 * (and USEBIO pair number) the same on every board it plays.
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
  const { played, unplayed } = await splitSeatBoardsByResult(db, boardAnchorId);

  if (unplayed.length === 0) {
    return {
      ok: false,
      error: "Every board here already has a result — nothing to hand over.",
    };
  }

  // The leaving pair keeps only the boards it has actually played.
  const playedSet = new Set(played);
  const leavingKeeps = (leaving.boards ?? played)
    .filter((b) => playedSet.has(b))
    .sort((a, b) => a - b);

  // The returning pair gains every unplayed board (it may be non-contiguous).
  const returningBoards = [
    ...new Set([...(returning.boards ?? []), ...unplayed]),
  ].sort((a, b) => a - b);

  db.transaction((tx) => {
    if (leavingKeeps.length === 0) {
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
        boards: leavingKeeps,
        isArrivalAnchor: 0,
        secretKey: crypto.randomUUID(),
      })
      .where(eq(seatOccupancy.id, leaving.id))
      .run();

    tx.update(seatOccupancy)
      .set({ boards: returningBoards, isArrivalAnchor: 1, secretKey })
      .where(eq(seatOccupancy.id, returning.id))
      .run();
  });

  return { ok: true };
}
