import {
  AssignedTeam,
  baseSeatOf,
  formatPairNumber,
  parseSeat,
  scoredIdFor,
} from "@/model/participants";
import type { UsebioPlayer, UsebioTeamPair } from "./generate-usebio";

/**
 * A plain, framework-free view of one seat occupancy, as the teams USEBIO
 * export needs it. Kept structural so this module stays pure and unit-testable
 * with plain objects; `usebio-service.ts` builds these from the `seat_occupancy`
 * rows joined to their players.
 */
export interface TeamOccupancy {
  id: number;
  /** The physical pair seat, e.g. "A1NS" / "A1EW". */
  seat: string;
  /** The movement anchor id board rows carry for this seat (null ⇒ the seat). */
  anchorId: string | null;
  /**
   * Board numbers this occupant played; null ⇒ every board the seat plays. The
   * set may be non-contiguous: a pair that was substituted out and later handed
   * back in (EBU §2.4.7) covers its early boards AND its later ones.
   */
  boards: number[] | null;
  player1: UsebioPlayer;
  player2: UsebioPlayer;
}

/**
 * The partnerships of every team, plus a way to find which partnership sat a
 * given seat for a given board — so a team's traveller line can say WHICH of its
 * pairs played it (it matters once a substitute pair has come in).
 */
export interface TeamPairing {
  /** Each team's partnerships (starting pairs first, then any substitutes). */
  pairsByTeamId: Map<string, UsebioTeamPair[]>;
  /**
   * The pair number of whoever sat the seat that board rows call `boardId` for
   * `boardNumber`, or undefined when no occupant can be found for it.
   */
  pairNumberFor(boardId: string, boardNumber: number): string | undefined;
}

/** Key a team by its home table: the NS and EW seats of one table share it. */
function tableKey(seat: string): string {
  const { section, tableNumber } = parseSeat(seat);
  return `${section}|${tableNumber}`;
}

/**
 * Build every team's partnerships and the board→partnership lookup.
 *
 * A team is the pair(s) at one home table: its NS seat and its EW seat. Each
 * seat normally has one occupant; a handed-over seat has two (the pair that
 * started it and the substitute that took over). Partnerships are ordered
 * STARTING pairs first (NS then EW), then SUBSTITUTES (NS then EW).
 *
 * USEBIO treats a pair number as an opaque string — it only has to match
 * between the PAIR and the traveller lines — so we use the app's own scored id
 * (as the pairs export does): the pair that started a seat is the bare seat
 * ("1NS"), and a substitute is the seat plus its occupancy id ("1NS#7"). The
 * section prefix is dropped unless the teams span more than one section. A
 * pair that returns after a substitute is the SAME occupancy (its board set
 * just grows), so it keeps its id and adds no player to the roster.
 *
 * When `occupancies` carries nothing for a team's table (e.g. a caller that only
 * has the roster), the team's own two pairs are used.
 */
export function buildTeamPairing(
  teams: readonly AssignedTeam[],
  occupancies: readonly TeamOccupancy[] = [],
): TeamPairing {
  const includeSection =
    new Set(teams.map((t) => parseSeat(t.id).section)).size > 1;
  const byTable = new Map<string, TeamOccupancy[]>();
  for (const occ of occupancies) {
    const key = tableKey(occ.seat);
    const arr = byTable.get(key) ?? [];
    arr.push(occ);
    byTable.set(key, arr);
  }

  const pairsByTeamId = new Map<string, UsebioTeamPair[]>();
  // board id (anchorId ?? seat) -> the occupants that sat it, with their numbers.
  const occupantsByBoardId = new Map<
    string,
    { occ: TeamOccupancy; pairNumber: string }[]
  >();

  for (const team of teams) {
    const provided = byTable.get(tableKey(team.id)) ?? [];
    // Fall back to the team's own two pairs (the no-substitution shape).
    const occs: TeamOccupancy[] =
      provided.length > 0
        ? provided
        : [team.pair1, team.pair2].map((pair, i) => ({
            id: -(i + 1),
            seat: pair.initialSeat,
            anchorId: null,
            boards: null,
            player1: pair.player1,
            player2: pair.player2,
          }));

    // Group by seat direction so each seat's occupants can be told apart.
    const seatOrder = ["NS", "EW"] as const;
    const starters: TeamOccupancy[] = [];
    const substitutes: TeamOccupancy[] = [];
    for (const direction of seatOrder) {
      const atSeat = occs
        .filter((o) => parseSeat(o.seat).direction === direction)
        // The pair that started the seat is always the first occupancy
        // created, so it has the lowest id; the substitute is inserted later.
        // Ordering by id (NOT by which pair currently holds the device) keeps
        // every pair's number stable when the original pair is handed back in.
        .sort((a, b) => a.id - b.id);
      if (atSeat.length === 0) continue;
      starters.push(atSeat[0]);
      substitutes.push(...atSeat.slice(1));
    }

    const starterIds = new Set(starters.map((o) => o.id));
    const ordered = [...starters, ...substitutes];
    const pairs: UsebioTeamPair[] = ordered.map((occ) => {
      // The starter is the bare seat; a substitute carries its occupancy id.
      const scoredId = starterIds.has(occ.id)
        ? occ.seat
        : scoredIdFor(occ.seat, occ.id);
      const pairNumber = formatPairNumber(scoredId, includeSection);
      const boardId = occ.anchorId ?? occ.seat;
      const list = occupantsByBoardId.get(boardId) ?? [];
      list.push({ occ, pairNumber });
      occupantsByBoardId.set(boardId, list);
      return { pairNumber, player1: occ.player1, player2: occ.player2 };
    });
    pairsByTeamId.set(team.id, pairs);
  }

  return {
    pairsByTeamId,
    pairNumberFor(boardId, boardNumber) {
      const list = occupantsByBoardId.get(baseSeatOf(boardId));
      if (!list || list.length === 0) return undefined;
      const covering =
        list.find(({ occ }) => occ.boards?.includes(boardNumber)) ??
        // A whole-seat occupant (boards = null) covers every board.
        list.find(({ occ }) => occ.boards == null);
      return (covering ?? list[0]).pairNumber;
    },
  };
}
