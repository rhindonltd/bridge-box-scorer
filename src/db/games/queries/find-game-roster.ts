import { Db } from "@/db/games";
import { players } from "@/db/games/tables/players";
import { boards } from "@/db/games/tables/boards";
import { eq } from "drizzle-orm";
import { readSeatOccupancies } from "@/db/games/queries/seat-occupancy";
import {
  findSubstitutionSeats,
  type SubstitutionSeat,
} from "@/db/games/queries/find-substitution-seats";
import {
  findAbsentPairs,
  type AbsentPair,
} from "@/db/games/queries/find-absent-pairs";

/**
 * A pair's status on the director's "Pairs" roster (design §11):
 *   - ACTIVE           playing normally
 *   - WITHDRAWN        withdrew part-way
 *   - LATE             arrived after the start
 *   - WITHOUT_STANDING plays but is not ranked (§2.4.9)
 *   - SUBSTITUTED      a §2.4.7 handover seat (two pairs over one seat)
 *   - NOT_ARRIVED      an expected-late seat nobody has filled yet
 */
export type RosterStatus =
  | "ACTIVE"
  | "WITHDRAWN"
  | "LATE"
  | "WITHOUT_STANDING"
  | "SUBSTITUTED"
  | "NOT_ARRIVED";

/** One seat on the director's roster. */
export interface RosterEntry {
  /** The seat (section-qualified, e.g. "A1NS"). */
  seat: string;
  /**
   * The movement's id for this pair (section-qualified, e.g. "A4"), when it
   * differs from the seat the pair started at (Howell, one-winner Mitchell,
   * Swiss). Absent when the board rows carry the seat itself, and for an
   * expected-late seat nobody has filled (no occupancy to read it from).
   * Display this, not the seat, once the game has started.
   */
  anchorId?: string;
  /** "First Last & First Last", or null for a seat nobody has filled yet. */
  pair: string | null;
  status: RosterStatus;
  /**
   * The absence detail when the seat is late / withdrawn / not arrived — the
   * director's AVE−/AVE+ vs Removed choice and what it misses.
   */
  absence?: AbsentPair;
  /** The substitution detail when the seat is a §2.4.7 handover. */
  substitution?: SubstitutionSeat;
}

/**
 * The movement id each round-1 chair carries, keyed by seat ("A2EW" → "A4"),
 * read from the round-1 board rows. Used for a seat nobody has filled, which
 * has no `anchorId` stamped on an occupancy. A seat with no round-1 row (or a
 * malformed section) is simply absent from the map.
 */
async function readRoundOneAnchors(db: Db): Promise<Map<string, string>> {
  const rows = await db
    .select({
      section: boards.section,
      tableNumber: boards.tableNumber,
      ns: boards.ns,
      ew: boards.ew,
    })
    .from(boards)
    .where(eq(boards.roundNumber, 1));
  const out = new Map<string, string>();
  for (const r of rows) {
    out.set(`${r.section}${r.tableNumber}NS`, r.ns);
    out.set(`${r.section}${r.tableNumber}EW`, r.ew);
  }
  return out;
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
 * Every pair in a board-pooled PAIRS game with its current status, for the
 * director's "Pairs" roster screen. One entry per seat. Most are ACTIVE; a
 * seat that has had a handover is SUBSTITUTED; a late / withdrawn pair (or a
 * still-empty expected-late seat) carries its {@link AbsentPair} detail so the
 * row can offer the AVE−/AVE+ vs Removed choice.
 *
 * Ordering: seats that need the director's attention first (not arrived, late,
 * withdrawn, substituted, without standing), then active seats, each group by
 * seat.
 */
export async function findGameRoster(db: Db): Promise<RosterEntry[]> {
  const [occupancies, playerRows, substitutions, absences] = await Promise.all([
    readSeatOccupancies(db),
    db.select().from(players),
    findSubstitutionSeats(db),
    findAbsentPairs(db),
  ]);
  const byPlayerId = new Map(playerRows.map((p) => [p.id, p]));
  const subBySeat = new Map(substitutions.map((s) => [s.seat, s]));
  const absenceBySeat = new Map(absences.map((a) => [a.seat, a]));

  // One entry per seat. A substitution seat has two occupancies; the primary
  // (ranked) occupant names the seat, and the substitution detail carries both.
  const bySeat = new Map<string, RosterEntry>();

  for (const occ of occupancies) {
    const existing = bySeat.get(occ.seat);
    const name = pairName(
      byPlayerId.get(occ.player1),
      byPlayerId.get(occ.player2),
    );
    const sub = subBySeat.get(occ.seat);
    const absence = absenceBySeat.get(occ.seat);

    const status: RosterStatus = sub
      ? "SUBSTITUTED"
      : absence?.kind === "WITHDRAWN"
        ? "WITHDRAWN"
        : absence?.kind === "LATE"
          ? "LATE"
          : occ.standing === "WITHOUT_STANDING"
            ? "WITHOUT_STANDING"
            : "ACTIVE";

    // For a substitution the detail already carries both occupants' names; keep
    // the first one seen (the anchor) as the seat's display pair.
    if (!existing) {
      bySeat.set(occ.seat, {
        seat: occ.seat,
        ...(occ.anchorId ? { anchorId: occ.anchorId } : {}),
        pair: sub ? sub.pair : name,
        status,
        ...(absence ? { absence } : {}),
        ...(sub ? { substitution: sub } : {}),
      });
    }
  }

  // Expected-late seats nobody has filled yet have no occupancy row, so no
  // stamped anchor. Their movement id is still known: it is what the round-1
  // board row at that table and direction carries.
  const roundOneAnchors = absences.some(
    (a) => a.kind === "EMPTY" && !bySeat.has(a.seat),
  )
    ? await readRoundOneAnchors(db)
    : new Map<string, string>();
  for (const a of absences) {
    if (a.kind !== "EMPTY" || bySeat.has(a.seat)) continue;
    const anchorId = roundOneAnchors.get(a.seat);
    bySeat.set(a.seat, {
      seat: a.seat,
      ...(anchorId ? { anchorId } : {}),
      pair: null,
      status: "NOT_ARRIVED",
      absence: a,
    });
  }

  const order: Record<RosterStatus, number> = {
    NOT_ARRIVED: 0,
    LATE: 1,
    WITHDRAWN: 2,
    SUBSTITUTED: 3,
    WITHOUT_STANDING: 4,
    ACTIVE: 5,
  };
  return [...bySeat.values()].sort(
    (a, b) => order[a.status] - order[b.status] || a.seat.localeCompare(b.seat),
  );
}
