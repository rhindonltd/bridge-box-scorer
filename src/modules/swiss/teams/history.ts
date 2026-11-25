import { parseSeat } from "@/model/participants";
import type { TeamId } from "@/model/teams-match-layout";
import {
  teamOpponentKey,
  type TripleKind,
} from "@/modules/swiss/teams/swiss-teams-pairing";

/** The `matches` columns the teams folds read. */
export interface SwissTeamsMatchRow {
  roundNumber: number;
  kind: string;
  home: string;
  opponent: string | null;
  groupId: string | null;
  vpPool: number | null;
  boardStart: number;
  boardEnd: number;
}

/** One triple played so far: its teams and the round(s) it spans. */
export interface SwissTeamsTripleRecord {
  kind: TripleKind;
  teams: [number, number, number];
  rounds: number[];
}

/** A section's Swiss Teams history, folded from its match rows. */
export interface SwissTeamsHistory {
  /** The highest round materialized so far (0 when none). */
  highestRound: number;
  playedOpponents: Set<string>;
  /** Teams that have already had a bye (recovered from BYE match rows). */
  hadBye: Set<TeamId>;
  /** Teams that have already been in a triple (recovered from TRIPLE rows). */
  hadTriple: Set<TeamId>;
  /** Every triple played so far (short + long), recovered from the match rows. */
  triples: SwissTeamsTripleRecord[];
}

/** Safe home-table id of a seat string, or null when it is not a seat. */
export function teamTableOf(seat: string): TeamId | null {
  try {
    return parseSeat(seat).tableNumber;
  } catch {
    return null;
  }
}

/**
 * Reduce a section's `matches` rows to the Swiss Teams history the draw needs:
 * the highest round materialized so far, the set of team matchups already
 * played, the teams that have already had a bye, and every triple played so far
 * (with the teams in each, so a long triple's second slot can reuse its first
 * slot's teams). Pass only the rows of the rounds to count.
 *
 * The authoritative `matches` table is read directly — no triple re-detection.
 * A TEAMS or TRIPLE row's `home`/`opponent` are the two teams' home-NS seats
 * (a played matchup); a BYE row names the sitting team; a triple's TRIPLE rows
 * share a `groupId` and together name its three teams and the round(s) it spans
 * (SHORT one round, LONG two).
 */
export function swissTeamsHistory(
  matchRows: readonly SwissTeamsMatchRow[],
): SwissTeamsHistory {
  const playedOpponents = new Set<string>();
  const hadBye = new Set<TeamId>();
  const hadTriple = new Set<TeamId>();
  let highestRound = 0;

  // Per groupId, a triple's teams and the rounds it spans.
  const tripleByGroup = new Map<
    string,
    { kind: TripleKind; teams: Set<number>; rounds: Set<number> }
  >();

  for (const m of matchRows) {
    highestRound = Math.max(highestRound, m.roundNumber);
    const home = teamTableOf(m.home);
    const away = m.opponent != null ? teamTableOf(m.opponent) : null;

    if (m.kind === "BYE") {
      if (home != null) hadBye.add(home);
      continue;
    }

    if (home != null && away != null) {
      playedOpponents.add(teamOpponentKey(home, away));
    }

    if (m.kind === "TRIPLE" && m.groupId != null) {
      const entry = tripleByGroup.get(m.groupId) ?? {
        kind: (m.vpPool === 20 ? "LONG" : "SHORT") as TripleKind,
        teams: new Set<number>(),
        rounds: new Set<number>(),
      };
      if (home != null) entry.teams.add(home);
      if (away != null) entry.teams.add(away);
      entry.rounds.add(m.roundNumber);
      tripleByGroup.set(m.groupId, entry);
    }
  }

  const triples: SwissTeamsTripleRecord[] = [];
  for (const { kind, teams, rounds } of tripleByGroup.values()) {
    for (const t of teams) hadTriple.add(t);
    const sortedTeams = [...teams].sort((a, b) => a - b);
    triples.push({
      kind,
      teams: [sortedTeams[0], sortedTeams[1], sortedTeams[2]] as [
        number,
        number,
        number,
      ],
      rounds: [...rounds].sort((a, b) => a - b),
    });
  }

  return { highestRound, playedOpponents, hadBye, hadTriple, triples };
}

/**
 * The committed seating of one TEAMS round — the "actual" opponents for the EBU
 * §3.5 comparison, with the teams that were in a triple or on a bye that round
 * set aside so detection assesses only the ordinary head-to-head tables.
 */
export interface SwissTeamsCommittedRound {
  roundNumber: number;
  /** Each ordinary (non-triple, non-bye) home team's committed opponent. */
  opponentByTeam: Map<TeamId, TeamId>;
  /** Home table number each team sat at this round (NS = home team). */
  homeTableByTeam: Map<TeamId, number>;
  /** Teams in a triple or on a bye this round — excluded from the ORDINARY scan. */
  excludedTeams: Set<TeamId>;
  /**
   * The round's committed triples, each as its three teams and its three
   * head-to-head comparisons (with board spans). Empty when the round had no
   * triple. Triple-internal §3.5 detection (F21 Part B) runs over these; the
   * ordinary scan still ignores the triple teams via `excludedTeams`.
   */
  triples: CommittedTriple[];
}

/** One committed triple: its three teams and its three head-to-head comparisons. */
export interface CommittedTriple {
  /** The three teams' home-table ids, ascending. */
  members: TeamId[];
  comparisons: CommittedTripleComparison[];
}

/** One head-to-head comparison inside a committed triple. */
export interface CommittedTripleComparison {
  /** The lower-table team of this comparison. */
  low: TeamId;
  /** The higher-table team of this comparison. */
  high: TeamId;
  /** Inclusive board range this comparison was played over. */
  boardStart: number;
  boardEnd: number;
}

/**
 * A teams round's committed opponents, from its `matches` rows (pass only that
 * round's rows). Each TEAMS match is one ordinary head-to-head (`home`/
 * `opponent` naming the two teams' home-NS seats). Teams in this round's TRIPLE
 * comparisons or on a BYE are collected into `excludedTeams` and left OUT of
 * `opponentByTeam`, so a mismatch scan runs on the ordinary tables only. No
 * triple RE-DETECTION.
 */
export function swissTeamsCommittedRound(
  matchRows: readonly SwissTeamsMatchRow[],
  roundNumber: number,
): SwissTeamsCommittedRound {
  const excludedTeams = new Set<TeamId>();
  const opponentByTeam = new Map<TeamId, TeamId>();
  const homeTableByTeam = new Map<TeamId, number>();
  // Committed triple comparisons, grouped by the triple's groupId.
  const tripleComparisonsByGroup = new Map<
    string,
    CommittedTripleComparison[]
  >();
  const tripleMembersByGroup = new Map<string, Set<TeamId>>();

  for (const m of matchRows) {
    const home = teamTableOf(m.home);
    const away = m.opponent != null ? teamTableOf(m.opponent) : null;

    if (m.kind === "BYE") {
      if (home != null) excludedTeams.add(home);
      continue;
    }

    if (m.kind === "TRIPLE") {
      // A triple's teams are excluded from the ordinary head-to-head scan, but
      // its comparisons are collected for triple-internal §3.5 detection.
      if (home != null) excludedTeams.add(home);
      if (away != null) excludedTeams.add(away);
      if (home != null && away != null && m.groupId != null) {
        const comps = tripleComparisonsByGroup.get(m.groupId) ?? [];
        comps.push({
          low: Math.min(home, away),
          high: Math.max(home, away),
          boardStart: m.boardStart,
          boardEnd: m.boardEnd,
        });
        tripleComparisonsByGroup.set(m.groupId, comps);
        const members =
          tripleMembersByGroup.get(m.groupId) ?? new Set<TeamId>();
        members.add(home);
        members.add(away);
        tripleMembersByGroup.set(m.groupId, members);
      }
      continue;
    }

    // An ordinary TEAMS head-to-head.
    if (home == null || away == null) continue;
    // Home team sits NS at its own table; the match's home seat table IS that
    // table number. Both teams host each other's away pair, so record both
    // directions' home tables.
    homeTableByTeam.set(home, home);
    homeTableByTeam.set(away, away);
    opponentByTeam.set(home, away);
    opponentByTeam.set(away, home);
  }

  // Drop any excluded (triple/bye) team from the ordinary opponent map, and any
  // team whose recorded opponent is excluded.
  for (const team of excludedTeams) {
    opponentByTeam.delete(team);
  }
  for (const [team, opp] of [...opponentByTeam]) {
    if (excludedTeams.has(opp)) opponentByTeam.delete(team);
  }

  const triples: CommittedTriple[] = [];
  for (const [groupId, comps] of tripleComparisonsByGroup) {
    /* v8 ignore next -- unreachable: every group with comparisons also has a members entry (set together above) */
    const members = [...(tripleMembersByGroup.get(groupId) ?? new Set())].sort(
      (a, b) => a - b,
    );
    triples.push({
      members,
      comparisons: comps.sort((a, b) => a.low - b.low || a.high - b.high),
    });
  }

  return {
    roundNumber,
    opponentByTeam,
    homeTableByTeam,
    excludedTeams,
    triples,
  };
}
