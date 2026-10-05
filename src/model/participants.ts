import { NewPlayer, Player } from "@/db/games/tables/players";
import { PairDirection } from "@/model/common";

export interface ParticipantsByMode {
  PAIR: {
    nsId: string;
    ewId: string;
  };
}

export type TravellerParticipantMode = "PAIR";

/* ---------- seat ---------- */

/**
 * A section is identified by a single uppercase letter (A, B, C, ...). Table
 * numbers restart within each section, so a seat is only unique when qualified
 * by its section.
 */
export type SectionLetter = string;

/**
 * A section-qualified pair seat: `${section}${table}${direction}`, e.g.
 * "A3NS". Every seat in the system carries its section prefix; there is no
 * unprefixed form.
 */
export type SectionedSeat = `${SectionLetter}${number}${PairDirection}`;

// Retained name for the pair seat type; now always section-qualified.
export type PairSeat = SectionedSeat;

export type Seat = PairSeat;

const SEAT_REGEX = /^([A-Z]+)(\d+)(NS|EW)$/;

export function isPairSeat(seat: Seat): seat is PairSeat {
  return SEAT_REGEX.test(seat);
}

/**
 * Decode a section-qualified seat into its parts.
 *
 * Accepts a plain `string` rather than the `Seat` template-literal type,
 * because the values callers most often decode — a board row's `ns`/`ew`
 * participant id, or a team id — are stored as `string`. The regex still
 * validates the shape and throws on anything unqualified, so widening the
 * parameter removes the `as Parameters<typeof parseSeat>[0]` casts callers
 * previously needed without loosening the actual check.
 *
 * @throws if the seat is not a valid section-qualified seat (e.g. an
 *   unprefixed "3NS"); all seats in the system are expected to be qualified.
 */
export function parseSeat(seat: string): {
  section: SectionLetter;
  tableNumber: number;
  direction: PairDirection;
} {
  const match = SEAT_REGEX.exec(seat);
  if (!match) {
    throw new Error(`Invalid seat: ${seat}`);
  }

  const [, section, table, direction] = match;
  return {
    section,
    tableNumber: Number(table),
    direction: direction as PairDirection,
  };
}

/**
 * The section letter of a section-qualified seat or team id (e.g. "A1NS" or
 * "A1" -> "A"). A thin wrapper over {@link parseSeat} for the common case of
 * grouping pairs/teams by section without needing the table or direction.
 *
 * @throws if the id is not a valid section-qualified seat.
 */
export function sectionOf(id: string): SectionLetter {
  return parseSeat(id).section;
}

/**
 * Build a section-qualified seat from its parts.
 */
export function seatFor(
  section: SectionLetter,
  tableNumber: number,
  direction: PairDirection,
): PairSeat {
  return `${section}${tableNumber}${direction}` as PairSeat;
}

/**
 * Format a pair number for display / export from its section-qualified seat.
 *
 * When the game has a single section the section prefix is redundant, so it is
 * dropped (e.g. "A1NS" -> "1NS"); with multiple sections the full qualified
 * seat is kept so pairs stay distinguishable across sections. A value that is
 * not a valid section-qualified seat is returned unchanged.
 */
export function formatPairNumber(
  seat: string,
  includeSection: boolean,
): string {
  if (includeSection) return seat;
  const match = SEAT_REGEX.exec(seat);
  if (!match) return seat;
  const [, , table, direction] = match;
  return `${table}${direction}`;
}

/**
 * The stable id of the TEAM whose home table a seat belongs to: the seat's
 * section + table number, with the NS/EW direction dropped (e.g. "A1NS" and
 * "A1EW" both map to "A1"). A team is the two pairs at one home table, so both
 * of its pair seats resolve to the same team id. This is the key used by the
 * `teams` table (which stores the optional team name).
 */
export function deriveTeamId(seat: Seat): string {
  const { section, tableNumber } = parseSeat(seat);
  return `${section}${tableNumber}`;
}

/* ---------- participants ---------- */

export type NewPair = {
  type: "PAIR";
  initialSeat: PairSeat;
  player1: NewPlayer;
  player2: NewPlayer;
};

export type Pair = {
  type: "PAIR";
  initialSeat: PairSeat;
  player1: Player;
  player2: Player;
};

export type Team = {
  type: "TEAM";
  pair1: Pair;
  pair2: Pair;
};

export type NewParticipant = NewPair;

export type Participant = Pair | Team;

/* ---------- assignment ---------- */

export type PairAssignment = {
  type: "PAIR";
  id: string;
};

export type TeamAssignment = {
  type: "TEAM";
  id: string;
};

export type Assignment = TeamAssignment | PairAssignment;

/* ---------- assigned participant ---------- */

export type AssignedPair = Pair & PairAssignment;

export type AssignedTeam = Team &
  TeamAssignment & {
    /**
     * The team's display name. Either the name entered by the home (NS) pair or,
     * when none was entered, the North player's surname (resolved at read time
     * in `findTeams`, so a later change of the North player is reflected).
     */
    name: string;
  };

export type AssignedParticipant = AssignedTeam | AssignedPair;

interface PairsParticipants {
  type: "PAIRS";
  ns: string;
  ew: string;
  nsNames?: string | null;
  ewNames?: string | null;
}

export interface BoardInstance {
  roundNumber: number;
  tableNumber: number;
  boardNumber: number;
  participants: PairsParticipants;
  currentResult: string | null;
  status: string | null;
}

/**
 * Team-match framing for a single board's traveller (Swiss Teams / Teams Round
 * Robin). A team match is played in two rooms sharing the board — the "open"
 * room at the home team's table and the "closed" room at the opponent's — so
 * the two physical table rows of a match belong together. This describes that
 * grouping so the director traveller can present the flat per-table
 * {@link BoardInstance} rows as team-vs-team cards; it never replaces the rows
 * (each table stays independently selectable for a per-table override).
 */
export interface TeamTravellerMatch {
  /** The two table numbers this head-to-head comparison spans. */
  tables: number[];
  /**
   * The home team at each of those tables, aligned by index with `tables`:
   * `teams[i]` is the team whose home (NS) pair sits at `tables[i]`. Its `id`
   * is the home NS seat and `name` the resolved display name (leaderboard
   * parity).
   */
  teams: { table: number; id: string; name: string }[];
  /**
   * Net IMP margin on this board from the primary (lowest-table) team's
   * perspective, or null when the board is not comparable yet (a room hasn't a
   * scored result).
   *
   * Every teams encounter is framed as a two-team head-to-head here, including
   * a three-way triple: a triple's three comparisons (x-y, y-z, z-x) each sit
   * on their own board set, so any one board belongs to exactly one comparison
   * and shows as an ordinary two-team card — never a single three-way card.
   */
  margin: number | null;
}
