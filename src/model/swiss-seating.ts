import type { PlayerRecord } from "@/model/participants";
import type { TeamId } from "@/model/teams-match-layout";

/**
 * A drawn Swiss round with each pair's or team's names resolved, for the
 * director's draw preview. Built by the core (names need the database) and
 * shown by the client, so the types live in the kernel. Pair ids are the
 * stable Swiss pair numbers.
 */

/* ---------- Swiss Pairs ---------- */

/** One table's seating with resolved player names, ready to render. */
export interface NamedSeatingTable {
  tableNumber: number;
  /** Stable Swiss pair id (a number) sitting North/South. */
  nsPairId: number;
  /** Stable Swiss pair id sitting East/West. */
  ewPairId: number;
  players: {
    N: PlayerRecord | null;
    S: PlayerRecord | null;
    E: PlayerRecord | null;
    W: PlayerRecord | null;
  };
}

/** The bye pair with resolved player names. */
export interface NamedByePair {
  pairId: number;
  players: { player1: PlayerRecord | null; player2: PlayerRecord | null };
}

/** One pair in a half-match group, with its two player names. */
export interface NamedHalfMatchPair {
  pairId: number;
  players: { player1: PlayerRecord | null; player2: PlayerRecord | null };
}

/**
 * A drawn 2-half-matches group with names, for the preview. The anchor plays
 * both halves at its table; `halfOneOpponent` plays the first half, then
 * swaps out for `halfTwoOpponent` in the second.
 */
export interface NamedHalfMatch {
  anchorTable: number;
  anchorDirection: "NS" | "EW";
  anchor: NamedHalfMatchPair;
  halfOneOpponent: NamedHalfMatchPair;
  halfTwoOpponent: NamedHalfMatchPair;
}

/**
 * A round's seating with names: the played tables, the optional bye pair, and
 * the optional 2-half-matches group (mutually exclusive with the bye).
 */
export interface NamedSeating {
  tables: NamedSeatingTable[];
  bye: NamedByePair | null;
  halfMatch: NamedHalfMatch | null;
}

/* ---------- Swiss Teams ---------- */

/** A team identified by its stable id and resolved display name. */
export interface NamedTeam {
  teamId: TeamId;
  name: string;
}

/** One drawn match with both teams' names. */
export interface NamedTeamsMatch {
  a: NamedTeam;
  b: NamedTeam;
}

/** A three-way triple with all three teams' names. */
export interface NamedTeamsTriple {
  a: NamedTeam;
  b: NamedTeam;
  c: NamedTeam;
}

/** A round's team draw with names: the matches plus any bye or triple. */
export interface NamedTeamsSeating {
  matches: NamedTeamsMatch[];
  bye: NamedTeam | null;
  triple: NamedTeamsTriple | null;
}
