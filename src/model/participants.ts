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

/**
 * A seat, optionally carrying a trailing `#<occupancyId>` suffix.
 *
 * The suffix identifies ONE occupant of a seat held by more than one pair over
 * the event — a mid-session stand-by → real-pair handover (EBU §2.4.7; see
 * `docs/design/seat-occupancy-handover.md`). It only ever appears on a
 * TRANSIENT scored-field id in the leaderboard / USEBIO ranking path, so a
 * second occupant of a seat ranks as its own line; it is NEVER persisted (board
 * rows, matches, and `seat_occupancy.seat` carry the bare seat). The parser
 * accepts and discards it so the seat identity (section / table / direction) is
 * unchanged, and exposes it separately as `occupancyId` for callers that care.
 *
 * `([A-Z]+)(\d+)(NS|EW)` is the seat; `(?:#(\d+))?` is the optional occupant id.
 */
const SEAT_REGEX = /^([A-Z]+)(\d+)(NS|EW)(?:#(\d+))?$/;

export function isPairSeat(seat: Seat): seat is PairSeat {
  return SEAT_REGEX.test(seat);
}

/**
 * Build a scored-field id for one occupant of a seat. The PRIMARY occupant uses
 * the bare seat (so every ordinary game is unchanged); a non-primary occupant
 * (a handover stand-in) gets a `<seat>#<occupancyId>` id so it ranks as its own
 * line. See {@link SEAT_REGEX}.
 */
export function scoredIdFor(seat: string, occupancyId?: number | null): string {
  return occupancyId == null ? seat : `${seat}#${occupancyId}`;
}

/**
 * Strip any `#<occupancyId>` suffix from a scored-field id, returning the bare
 * seat. A no-op for an ordinary seat / board id.
 */
export function baseSeatOf(id: string): string {
  const hash = id.indexOf("#");
  return hash === -1 ? id : id.slice(0, hash);
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
  /** The occupant id from a `#<id>` handover suffix, or null for a bare seat. */
  occupancyId: number | null;
} {
  const match = SEAT_REGEX.exec(seat);
  if (!match) {
    throw new Error(`Invalid seat: ${seat}`);
  }

  const [, section, table, direction, occupancyId] = match;
  return {
    section,
    tableNumber: Number(table),
    direction: direction as PairDirection,
    occupancyId: occupancyId != null ? Number(occupancyId) : null,
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
 *
 * A `#<occupancyId>` handover suffix is PRESERVED (e.g. "A1NS#5" -> "1NS#5"),
 * so a stand-in occupant stays a distinct pair number for export/display.
 */
export function formatPairNumber(
  seat: string,
  includeSection: boolean,
): string {
  if (includeSection) return seat;
  const match = SEAT_REGEX.exec(seat);
  if (!match) return seat;
  const [, , table, direction, occupancyId] = match;
  const suffix = occupancyId != null ? `#${occupancyId}` : "";
  return `${table}${direction}${suffix}`;
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

/**
 * A seated contestant's lifecycle standing (EBU White Book §2.4), surfaced to
 * the client so the director UI can show/edit it. Mirrors the `participants`
 * lifecycle columns. Optional on {@link Pair} so the many existing `Pair`
 * literals (tests, teams assemblers) that predate this stay valid; `findPairs`
 * always populates it from the DB.
 */
export type ParticipantStanding = {
  standing: "ACTIVE" | "WITHDRAWN" | "WITHOUT_STANDING" | "LATE";
  /** The round the pair withdrew in / arrived in (coarse context). */
  withdrawnInRound: number | null;
  /** §2.4.5 treatment for a WITHDRAWN / short-LATE pair. */
  withdrawalTreatment: "REMOVE" | "PENALISED" | null;
  /** 0..40 fine percentage (PENALISED only). */
  withdrawalFinePercent: number | null;
};

export type Pair = {
  type: "PAIR";
  initialSeat: PairSeat;
  player1: Player;
  player2: Player;
} & Partial<ParticipantStanding>;

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
