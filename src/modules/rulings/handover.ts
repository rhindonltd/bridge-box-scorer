import { pairName, type PlayerNameParts } from "@/model/player-name";
import { arrivalAnchorOf, type OccupantCandidate } from "./occupants";

/**
 * The rules of the EBU White Book §2.3.3 / §2.4.7 mid-session handover: a new
 * pair (or a pair that played the seat earlier) takes over a seat from the
 * next board onward. Pure decisions only; `db/games/actions/handover-seat`
 * reads the seat, calls these, and writes the result.
 */

/**
 * The most pairs a TEAM may field over an event: its two original pairs plus
 * one substitute — six players, the EBU's roster limit for a team of four. A
 * pair RETURNING to a seat it played earlier is the same occupancy (its board
 * set just grows), so a return never counts against this.
 */
export const MAX_PAIRS_PER_TEAM = 3;

/** The parts of a player used to recognise them again. */
export interface PlayerIdentity extends PlayerNameParts {
  nationalId?: string | null;
}

/** An arriving or recorded pair's two players. */
export interface PairIdentity<P = PlayerIdentity> {
  player1: P;
  player2: P;
}

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
  arriving: PairIdentity,
  recorded: PairIdentity<PlayerIdentity | undefined>,
): boolean {
  const { player1: r1, player2: r2 } = recorded;
  if (!r1 || !r2) return false;
  const { player1: a1, player2: a2 } = arriving;
  return (
    (isSamePlayer(a1, r1) && isSamePlayer(a2, r2)) ||
    (isSamePlayer(a1, r2) && isSamePlayer(a2, r1))
  );
}

/** A seat occupancy as the handover rules see it: its flags and player ids. */
export type HandoverOccupant = OccupantCandidate & {
  player1: number;
  player2: number;
};

/** A handover the rules refuse, with the reason shown to the director. */
export interface HandoverRejection {
  ok: false;
  error: string;
}

/** Who is handing the seat over to whom. */
export type HandoverChoice<T> =
  | HandoverRejection
  /** A new pair takes over from the seat's only occupant (the stand-in). */
  | { ok: true; kind: "newPair"; standIn: T }
  /** A pair that played this seat earlier comes back in. */
  | { ok: true; kind: "returningPair"; leaving: T; returning: T };

/**
 * Decide who an arriving pair takes the seat from. Rejected when:
 *   - the seat has no occupant (nobody to hand over from);
 *   - the arriving pair is the pair already playing the seat;
 *   - the seat already has a substitute and the arriving pair is a THIRD pair
 *     (a seat supports one substitute; only the pair who played it earlier can
 *     come back in).
 *
 * RETURNING PAIR. If the arriving pair already played this seat earlier
 * (recognised by {@link isSamePair}), it is NOT a new substitute: its existing
 * occupancy takes the unplayed boards back. So "the original pair comes back
 * after a substitute" is just a handover whose names match — one substitute,
 * not two.
 *
 * @param existing  The seat's occupancies.
 * @param playerById  The players of those occupancies, by id.
 */
export function chooseHandover<T extends HandoverOccupant>(
  existing: readonly T[],
  playerById: ReadonlyMap<number, PlayerIdentity>,
  arriving: PairIdentity,
): HandoverChoice<T> {
  if (existing.length === 0) {
    return { ok: false, error: "No pair is seated there to hand over from." };
  }

  const matches = (occ: T) =>
    isSamePair(arriving, {
      player1: playerById.get(occ.player1),
      player2: playerById.get(occ.player2),
    });

  const current = arrivalAnchorOf(existing);
  if (matches(current)) {
    return { ok: false, error: "That pair is already playing this seat." };
  }

  const returning = existing.find((o) => o.id !== current.id && matches(o));
  if (returning) {
    return { ok: true, kind: "returningPair", leaving: current, returning };
  }

  if (existing.length > 1) {
    const earlier = existing.find((o) => o.id !== current.id)!;
    return {
      ok: false,
      error: `This seat already has a substitute. Only the pair who played it earlier (${pairName(
        playerById.get(earlier.player1),
        playerById.get(earlier.player2),
      )}) can take it back.`,
    };
  }

  return { ok: true, kind: "newPair", standIn: existing[0] };
}

/**
 * The TEAMS roster limit for a NEW pair: a team is the pairs at a seat and at
 * its partner seat (same table, opposite direction). Rejected once the team
 * already fields {@link MAX_PAIRS_PER_TEAM} pairs, so its roster never exceeds
 * six players. Returns null when the new pair may join.
 */
export function teamHandoverRejection(
  seatPairs: number,
  partnerSeatPairs: number,
): HandoverRejection | null {
  if (seatPairs + partnerSeatPairs < MAX_PAIRS_PER_TEAM) return null;
  return {
    ok: false,
    error:
      "This team already has a substitute. A team can have at most six players.",
  };
}

/** A seat's boards, split by whether they already have a result. */
export interface SeatBoards {
  played: number[];
  unplayed: number[];
}

const NOTHING_TO_HAND_OVER: HandoverRejection = {
  ok: false,
  error: "Every board here already has a result — nothing to hand over.",
};

/**
 * The board split for a NEW pair. The split point is derived from the results
 * already entered, not chosen by the director: the stand-in keeps every board
 * that already has a result, and the arriving pair takes every board with no
 * result yet. So the two board sets are disjoint, jointly cover the seat, and
 * no in-flight board is split. Rejected when every board already has a result.
 */
export function newPairBoards(
  boards: SeatBoards,
):
  | HandoverRejection
  | { ok: true; standInBoards: number[]; arrivingBoards: number[] } {
  if (boards.unplayed.length === 0) return NOTHING_TO_HAND_OVER;
  return {
    ok: true,
    standInBoards: boards.played,
    arrivingBoards: boards.unplayed,
  };
}

/**
 * The board split for a RETURNING pair. The leaving pair keeps only the boards
 * it has actually played; the returning pair gains every unplayed board, so its
 * board set may become non-contiguous (e.g. 1–2 and 5–6). If the leaving pair
 * never played a board (`collapse`), the seat goes back to the returning pair
 * alone, as if no handover had happened. Rejected when every board already has
 * a result.
 *
 * @param leavingBoards  The leaving occupancy's boards (null = every board).
 * @param returningBoards  The returning occupancy's boards.
 */
export function returningPairBoards(
  leavingBoards: number[] | null,
  returningBoards: number[] | null,
  boards: SeatBoards,
):
  | HandoverRejection
  | { ok: true; collapse: true }
  | {
      ok: true;
      collapse: false;
      leavingKeeps: number[];
      returningBoards: number[];
    } {
  const { played, unplayed } = boards;
  if (unplayed.length === 0) return NOTHING_TO_HAND_OVER;

  const playedSet = new Set(played);
  const leavingKeeps = (leavingBoards ?? played)
    .filter((b) => playedSet.has(b))
    .sort((a, b) => a - b);
  if (leavingKeeps.length === 0) return { ok: true, collapse: true };

  return {
    ok: true,
    collapse: false,
    leavingKeeps,
    returningBoards: [
      ...new Set([...(returningBoards ?? []), ...unplayed]),
    ].sort((a, b) => a - b),
  };
}
