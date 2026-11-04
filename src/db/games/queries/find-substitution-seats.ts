import { Db } from "@/db/games";
import { boards } from "@/db/games/tables/boards";
import { players } from "@/db/games/tables/players";
import {
  readSeatOccupancies,
  arrivalAnchorOf,
  mergedLineOf,
} from "@/db/games/queries/seat-occupancy";
import type { SeatOccupancy } from "@/db/games/tables/seat-occupancy";

/**
 * One occupant of a §2.4.7 substitution seat, as the Substitutions screen needs
 * it to render and bind the per-occupant eligibility toggle.
 */
export interface SubstitutionOccupant {
  /** The occupancy's surrogate id — the key the eligibility write targets. */
  id: number;
  /** "First Last & First Last" for this pair. */
  pair: string;
  /** How many boards this occupant actually played. */
  boardCount: number;
  /**
   * Whether this occupant is currently ELIGIBLE for the local ranking / prize
   * export. `true` = ACTIVE (ranked); `false` = WITHOUT_STANDING (its results
   * count for its opponents but it is stripped from the ranking).
   */
  eligible: boolean;
  /**
   * Whether this occupant is the ARRIVAL ANCHOR (held the live device and
   * played the seat forward). The non-anchor is the earlier pair that was
   * handed over FROM — the default "without standing" pick.
   */
  isArrivalAnchor: boolean;
  /**
   * Whether this occupant is the current MAIN pair — the one whose name + EBU
   * record represents the ONE merged line (ranking + USEBIO `<PAIR>`) when the
   * seat is NOT split. Defaults to the arrival anchor until the director picks
   * otherwise. Only meaningful for a merged (`split = false`) seat.
   */
  isMainPair: boolean;
}

/**
 * One substituted seat (a §2.4.7 mid-game substitution) and its two occupants,
 * driving the director's Substitutions screen.
 */
export interface SubstitutionSeat {
  /** The physical seat (section-qualified, e.g. "A3NS"). */
  seat: string;
  /**
   * The ARRIVAL ANCHOR's display name — kept for back-compat with the existing
   * list rendering and the menu gate (a non-empty list ⇒ the menu item shows).
   */
  pair: string;
  /** Boards the anchor (arriving) pair actually played. */
  playedCount: number;
  /** Boards the earlier pair played before the handover. */
  missedCount: number;
  /**
   * Whether the seat currently scores as TWO separate lines (`split = 1`, each
   * occupant ranked on only its own boards) rather than ONE merged line
   * (`split = 0`, the default — one ranked line stitching both names locally,
   * one anchor-only `<PAIR>` in USEBIO).
   */
  split: boolean;
  /** The two occupants, anchor first then the earlier pair. */
  occupants: SubstitutionOccupant[];
}

function pairName(
  p1: { firstName: string; lastName: string } | undefined,
  p2: { firstName: string; lastName: string } | undefined,
): string {
  return [p1, p2]
    .filter((p): p is { firstName: string; lastName: string } => p != null)
    .map((p) => `${p.firstName} ${p.lastName}`.trim())
    .join(" & ");
}

/**
 * List the substituted seats — each seat that has had a §2.4.7 mid-game
 * substitution (two occupancies on one seat) — with BOTH occupants and the
 * seat's current split/eligibility choices, so the director can set them on the
 * Substitutions screen.
 *
 * A seat is a substitution when it has more than one occupancy. Each occupant
 * is surfaced with its id (the write key), display name, board count, and
 * current eligibility (ACTIVE ⇒ eligible, WITHOUT_STANDING ⇒ not). The arrival
 * anchor (the pair that finished the session on the live device) is listed
 * first; the earlier pair second.
 *
 * Empty for any game with no substitution.
 */
export async function findSubstitutionSeats(
  db: Db,
): Promise<SubstitutionSeat[]> {
  const occupancies = await readSeatOccupancies(db);

  // Group by the board-id (anchorId ?? seat) so we can match board rows and
  // detect handover seats (>1 occupancy).
  const bySeatBoardId = new Map<string, SeatOccupancy[]>();
  for (const o of occupancies) {
    const key = o.anchorId ?? o.seat;
    const arr = bySeatBoardId.get(key) ?? [];
    arr.push(o);
    bySeatBoardId.set(key, arr);
  }

  const substitutionSeats = [...bySeatBoardId.entries()].filter(
    ([, group]) => group.length > 1,
  );
  if (substitutionSeats.length === 0) return [];

  // The seat's full board set = distinct board numbers on rows carrying its id.
  const boardRows = await db
    .select({ ns: boards.ns, ew: boards.ew, boardNumber: boards.boardNumber })
    .from(boards);

  // Resolve player names once.
  const playerRows = await db.select().from(players);
  const byPlayerId = new Map(playerRows.map((p) => [p.id, p]));

  // The size of an occupant's own board set, resolving a null set to the seat's
  // full board set (the whole-seat case — defensive, shouldn't occur on a
  // handover seat whose occupancies are pinned to disjoint sets).
  const boardCountOf = (occ: SeatOccupancy, seatBoards: Set<number>): number =>
    occ.boards == null ? seatBoards.size : occ.boards.length;

  const result: SubstitutionSeat[] = [];
  for (const [boardAnchorId, group] of substitutionSeats) {
    const anchor = arrivalAnchorOf(group);
    // The current MAIN pair (merged-line identity) — the director's choice, or
    // the arrival anchor by default.
    const mainId = mergedLineOf(group).id;

    const seatBoards = new Set<number>();
    for (const row of boardRows) {
      if (row.ns === boardAnchorId || row.ew === boardAnchorId) {
        seatBoards.add(row.boardNumber);
      }
    }

    const toOccupant = (occ: SeatOccupancy): SubstitutionOccupant => ({
      id: occ.id,
      pair: pairName(byPlayerId.get(occ.player1), byPlayerId.get(occ.player2)),
      boardCount: boardCountOf(occ, seatBoards),
      eligible: occ.standing !== "WITHOUT_STANDING",
      isArrivalAnchor: occ.id === anchor.id,
      isMainPair: occ.id === mainId,
    });

    // Anchor first, then the other occupant(s) in id order (stable).
    const others = group
      .filter((o) => o.id !== anchor.id)
      .sort((a, b) => a.id - b.id);
    const occupants = [anchor, ...others].map(toOccupant);

    const playedCount = boardCountOf(anchor, seatBoards);
    const missedCount = seatBoards.size - playedCount;
    // The seat's split flag is carried on both occupancies; read it off any.
    const split = group.some((o) => o.split === 1);

    result.push({
      seat: anchor.seat,
      pair: occupants[0].pair,
      playedCount,
      missedCount,
      split,
      occupants,
    });
  }

  // Stable order by seat so the list doesn't reshuffle between reads.
  result.sort((a, b) => a.seat.localeCompare(b.seat));
  return result;
}
