import { Db } from "@/db/games";
import { boards } from "@/db/games/tables/boards";
import { matches } from "@/db/games/tables/matches";
import { players } from "@/db/games/tables/players";
import { seatOccupancy } from "@/db/games/tables/seat-occupancy";
import { eq } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { primaryOf } from "@/db/games/queries/seat-occupancy";

/** The default cap on how many outstanding boards the detail list returns. */
export const OUTSTANDING_DETAIL_LIMIT = 5;

/** One outstanding (playable, not-yet-finalized) board, with who is seated. */
export interface OutstandingBoard {
  section: string;
  tableNumber: number;
  boardNumber: number;
  roundNumber: number;
  /** "First Last & First Last" for the NS pair, or null if the seat is empty. */
  nsPair: string | null;
  /** "First Last & First Last" for the EW pair, or null if the seat is empty. */
  ewPair: string | null;
}

function pairName(
  p1: { firstName: string; lastName: string } | null,
  p2: { firstName: string; lastName: string } | null,
): string | null {
  if (!p1 && !p2) return null;
  const parts = [p1, p2]
    .filter((p): p is { firstName: string; lastName: string } => p != null)
    .map((p) => `${p.firstName} ${p.lastName}`.trim());
  return parts.length > 0 ? parts.join(" & ") : null;
}

/**
 * List the playable boards that still have no final result, resolved to the
 * pair names seated NS / EW, capped at `limit` rows (ordered by section, table,
 * board so the list is stable).
 *
 * "Playable" and "finalized" match {@link getResultsSummary} exactly (a board
 * is outstanding when it is neither a SIT_OUT / HALF_AVERAGE nor CONFIRMED /
 * OVERRIDDEN / CANCELLED / REMOVED_TEAMS, and its match carries no ruling), so
 * the count here is consistent with the summary's `totalPlayable - finalized`.
 *
 * Intended for the export readiness screen, which only shows this detail when a
 * SMALL number of boards are outstanding — hence the cap (the caller already
 * has the full count from the summary).
 *
 * Names are resolved via the seat occupancies: a board row's `ns`/`ew` is its
 * movement anchor id (`anchorId ?? seat`); we take that id's PRIMARY occupant
 * (the real pair for a §2.4.7 handover seat). A seat with no occupant (a
 * phantom / expected-late empty seat) yields a null name.
 */
export async function getOutstandingBoards(
  db: Db,
  limit: number = OUTSTANDING_DETAIL_LIMIT,
): Promise<OutstandingBoard[]> {
  const rows = await db
    .select({
      section: boards.section,
      roundNumber: boards.roundNumber,
      tableNumber: boards.tableNumber,
      boardNumber: boards.boardNumber,
      ns: boards.ns,
      ew: boards.ew,
      status: boards.status,
      ruling: matches.ruling,
    })
    .from(boards)
    .innerJoin(matches, eq(boards.matchId, matches.id));

  const outstanding = rows
    .filter((r) => r.status !== "SIT_OUT" && r.status !== "HALF_AVERAGE")
    .filter(
      (r) =>
        !(
          r.status === "CONFIRMED" ||
          r.status === "OVERRIDDEN" ||
          r.status === "CANCELLED" ||
          r.status === "REMOVED_TEAMS" ||
          r.ruling != null
        ),
    )
    .sort(
      (a, b) =>
        a.section.localeCompare(b.section) ||
        a.tableNumber - b.tableNumber ||
        a.boardNumber - b.boardNumber,
    )
    .slice(0, Math.max(limit, 0));

  if (outstanding.length === 0) return [];

  // Build a board-id -> pair-name map for the seats involved. The board id is
  // the seat's movement anchor (`anchorId ?? seat`); the displayed pair is that
  // id's PRIMARY occupant (the real pair for a handover seat).
  const p1 = alias(players, "p1");
  const p2 = alias(players, "p2");
  const occRows = await db
    .select({
      id: seatOccupancy.id,
      seat: seatOccupancy.seat,
      anchorId: seatOccupancy.anchorId,
      boardsSet: seatOccupancy.boards,
      standing: seatOccupancy.standing,
      // The merged-line pick (`primaryOf`) needs these flags; selecting them
      // explicitly keeps a handover seat's board-name resolution on the right
      // (main / anchor) pair instead of the lowest-id fallback.
      isArrivalAnchor: seatOccupancy.isArrivalAnchor,
      isMainLine: seatOccupancy.isMainLine,
      p1First: p1.firstName,
      p1Last: p1.lastName,
      p2First: p2.firstName,
      p2Last: p2.lastName,
    })
    .from(seatOccupancy)
    .innerJoin(p1, eq(seatOccupancy.player1, p1.id))
    .innerJoin(p2, eq(seatOccupancy.player2, p2.id));

  const byBoardId = new Map<string, typeof occRows>();
  for (const o of occRows) {
    const key = o.anchorId ?? o.seat;
    const arr = byBoardId.get(key) ?? [];
    arr.push(o);
    byBoardId.set(key, arr);
  }

  const nameByBoardId = new Map<string, string | null>();
  for (const [boardId, forSeat] of byBoardId) {
    const primary = primaryOf(
      forSeat.map((o) => ({
        id: o.id,
        boards: o.boardsSet,
        standing: o.standing,
        isArrivalAnchor: o.isArrivalAnchor,
        isMainLine: o.isMainLine,
      })),
    );
    const occ = forSeat.find((o) => o.id === primary.id) ?? forSeat[0];
    nameByBoardId.set(
      boardId,
      pairName(
        { firstName: occ.p1First, lastName: occ.p1Last },
        { firstName: occ.p2First, lastName: occ.p2Last },
      ),
    );
  }

  return outstanding.map((r) => ({
    section: r.section,
    tableNumber: r.tableNumber,
    boardNumber: r.boardNumber,
    roundNumber: r.roundNumber,
    nsPair: nameByBoardId.get(r.ns) ?? null,
    ewPair: nameByBoardId.get(r.ew) ?? null,
  }));
}
