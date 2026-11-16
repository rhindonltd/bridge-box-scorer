import { Db } from "@/db/games";
import { players } from "@/db/games/tables/players";
import { findTeams } from "@/db/games/queries/find-teams";
import { readSeatOccupancies } from "@/db/games/queries/seat-occupancy";
import { parseSeat, type Seat } from "@/model/participants";

/**
 * A team can field at most this many pairs across its two seats (the two
 * original pairs plus one substitute, i.e. six players). Mirrors
 * `MAX_PAIRS_PER_TEAM` in `handover-seat.ts`, which enforces it when a
 * handover is recorded; it is repeated here because that module is server-only
 * and the figure is surfaced to the director.
 */
export const TEAM_MAX_PAIRS = 3;

/** A team's standing on the roster (the lifecycle facts the director edits). */
export type TeamRosterStatus =
  | "ACTIVE"
  | "WITHDRAWN"
  | "LATE"
  | "WITHOUT_STANDING";

/** One of a team's two seats and every pair that has sat it. */
export interface TeamRosterSeat {
  /** The physical seat, e.g. "A1NS" (home) or "A1EW" (away). */
  seat: string;
  label: "Home" | "Away";
  /** Every pair that has played this seat, earliest first. */
  occupants: { pair: string; boardCount: number | null }[];
}

/** One team on the director's "Teams" roster. */
export interface TeamRosterEntry {
  /**
   * The team's id: its home NS seat (e.g. "A1NS"). The standing is stored on
   * this seat, so it is also the seat every standing change is sent to.
   */
  teamId: string;
  /** The team's display name (stored name, else the North player's surname). */
  name: string;
  /** The section letter. */
  section: string;
  /** The team's number within its section (its home table), e.g. "1". */
  number: string;
  status: TeamRosterStatus;
  /** The round it withdrew in / arrived in (WITHDRAWN and LATE only). */
  round: number | null;
  /** How the withdrawal / late arrival is treated, when one is recorded. */
  treatment: string | null;
  /** The two seats, home first. */
  seats: TeamRosterSeat[];
  /** How many pairs have played for the team (2 unless a substitute joined). */
  pairsUsed: number;
  /** The most pairs a team may field. */
  maxPairs: number;
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
 * Every team in a TEAMS game (Teams or Swiss Teams) with its standing and the
 * pairs that have played for it, for the director's "Teams" roster. A team is
 * the home (NS) pair plus the away (EW) pair at one table; its standing lives
 * on the home NS seat, which is what scoring reads.
 *
 * Substitutions are made by the players (a handover), never by the director, so
 * this only reports them: which pairs have sat each seat and how many boards
 * each played.
 *
 * Ordered by section then team number.
 */
export async function findTeamsRoster(db: Db): Promise<TeamRosterEntry[]> {
  const [teams, occupancies, playerRows] = await Promise.all([
    findTeams(db),
    readSeatOccupancies(db),
    db.select().from(players),
  ]);
  const byPlayerId = new Map(playerRows.map((p) => [p.id, p]));

  // Every occupancy of a seat, earliest first (the starter has the lowest id).
  const bySeat = new Map<string, typeof occupancies>();
  for (const occ of [...occupancies].sort((a, b) => a.id - b.id)) {
    const list = bySeat.get(occ.seat) ?? [];
    list.push(occ);
    bySeat.set(occ.seat, list);
  }

  const seatOf = (seat: string, label: "Home" | "Away"): TeamRosterSeat => ({
    seat,
    label,
    occupants: (bySeat.get(seat) ?? []).map((occ) => ({
      pair: pairName(byPlayerId.get(occ.player1), byPlayerId.get(occ.player2)),
      boardCount: occ.boards == null ? null : occ.boards.length,
    })),
  });

  return teams.map((team): TeamRosterEntry => {
    const { section, tableNumber } = parseSeat(team.id as Seat);
    const awaySeat = team.pair2.initialSeat;
    const seats = [seatOf(team.id, "Home"), seatOf(awaySeat, "Away")];

    // Standing is read off the home NS pair: it is the row scoring consults.
    const standing = team.pair1.standing ?? "ACTIVE";
    const hasRound = standing === "WITHDRAWN" || standing === "LATE";

    return {
      teamId: team.id,
      name: team.name,
      section,
      number: String(tableNumber),
      status: standing,
      round: hasRound ? (team.pair1.withdrawnInRound ?? null) : null,
      treatment: hasRound ? (team.pair1.withdrawalTreatment ?? null) : null,
      seats,
      pairsUsed: seats.reduce((n, s) => n + s.occupants.length, 0),
      maxPairs: TEAM_MAX_PAIRS,
    };
  });
}
