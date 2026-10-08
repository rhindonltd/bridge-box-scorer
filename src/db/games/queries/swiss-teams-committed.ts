import { Db } from "@/db/games";
import { matches } from "@/db/games/tables/matches";
import { and, eq, lt } from "drizzle-orm";
import { SectionLetter, parseSeat } from "@/model/participants";
import {
  teamOpponentKey,
  type TeamId,
} from "@/movement/swiss-teams/swiss-teams-pairing";

/**
 * Swiss TEAMS history reduced to what the draw engine needs, over the rounds
 * BEFORE `maxRoundExclusive` (`roundNumber < max`), using current board values.
 * This reconstructs the history the round-R teams draw consumed, for EBU §3.5
 * mismatch detection. Mirrors the pairs `getSwissBoardHistory(maxRoundExclusive)`.
 */
export interface SwissTeamsPriorHistory {
  playedOpponents: Set<string>;
  hadBye: Set<TeamId>;
  hadTriple: Set<TeamId>;
}

/** Safe home-table id of a seat string, or null when it is not a seat. */
function tableOf(seat: string): TeamId | null {
  try {
    return parseSeat(seat).tableNumber;
  } catch {
    return null;
  }
}

/** Read a section's match rows, optionally only rounds `< maxRoundExclusive`. */
async function sectionMatches(
  db: Db,
  section: SectionLetter,
  maxRoundExclusive?: number,
) {
  const where =
    maxRoundExclusive != null
      ? and(
          eq(matches.section, section),
          lt(matches.roundNumber, maxRoundExclusive),
        )
      : eq(matches.section, section);
  return db.select().from(matches).where(where);
}

/**
 * The teams history over rounds `< maxRoundExclusive`, as the round-R draw saw
 * it: matchups played, byes taken, and triples entered — read from the
 * first-class `matches` table (no triple RE-DETECTION).
 *
 * A TEAMS or TRIPLE match's `home`/`opponent` are the two teams' home-NS seats;
 * their home-table ids form a played-opponent key. A BYE names the sitting
 * team. A TRIPLE's three teams are collected into `hadTriple` via its `groupId`.
 */
export async function getSwissTeamsPriorHistory(
  db: Db,
  section: SectionLetter,
  maxRoundExclusive: number,
): Promise<SwissTeamsPriorHistory> {
  const matchRows = await sectionMatches(db, section, maxRoundExclusive);

  const playedOpponents = new Set<string>();
  const hadBye = new Set<TeamId>();
  const hadTriple = new Set<TeamId>();
  // A triple's three teams are spread across its comparison rows; collect per
  // groupId so all three are recorded even from a single comparison.
  const tripleTeamsByGroup = new Map<string, Set<TeamId>>();

  for (const m of matchRows) {
    const home = tableOf(m.home);
    const away = m.opponent != null ? tableOf(m.opponent) : null;

    if (m.kind === "BYE") {
      if (home != null) hadBye.add(home);
      continue;
    }

    if (home != null && away != null) {
      playedOpponents.add(teamOpponentKey(home, away));
    }

    if (m.kind === "TRIPLE" && m.groupId != null) {
      const set = tripleTeamsByGroup.get(m.groupId) ?? new Set<TeamId>();
      if (home != null) set.add(home);
      if (away != null) set.add(away);
      tripleTeamsByGroup.set(m.groupId, set);
    }
  }

  for (const teams of tripleTeamsByGroup.values()) {
    for (const t of teams) hadTriple.add(t);
  }

  return { playedOpponents, hadBye, hadTriple };
}

/**
 * The committed seating of one TEAMS round, recovered verbatim from the board
 * rows — the "actual" opponents for the EBU §3.5 comparison, with the teams
 * that were in a triple or on a bye that round set aside so detection assesses
 * only the ordinary head-to-head tables.
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
 * Read a teams round's committed opponents from the first-class `matches` table.
 * Each TEAMS match is one ordinary head-to-head (`home`/`opponent` naming the
 * two teams' home-NS seats). Teams in this round's TRIPLE comparisons or on a
 * BYE are collected into `excludedTeams` and left OUT of `opponentByTeam`, so a
 * mismatch scan runs on the ordinary tables only. No triple RE-DETECTION.
 */
export async function getSwissTeamsCommittedRound(
  db: Db,
  section: SectionLetter,
  roundNumber: number,
): Promise<SwissTeamsCommittedRound> {
  const matchRows = (await sectionMatches(db, section)).filter(
    (m) => m.roundNumber === roundNumber,
  );

  const excludedTeams = new Set<TeamId>();
  const opponentByTeam = new Map<TeamId, TeamId>();
  const homeTableByTeam = new Map<TeamId, number>();
  // Committed triple comparisons, grouped by the triple's groupId.
  const tripleComparisonsByGroup = new Map<string, CommittedTripleComparison[]>();
  const tripleMembersByGroup = new Map<string, Set<TeamId>>();

  for (const m of matchRows) {
    const home = tableOf(m.home);
    const away = m.opponent != null ? tableOf(m.opponent) : null;

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
        const members = tripleMembersByGroup.get(m.groupId) ?? new Set<TeamId>();
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
    const members = [...(tripleMembersByGroup.get(groupId) ?? new Set())].sort(
      (a, b) => a - b,
    );
    triples.push({
      members,
      comparisons: comps.sort(
        (a, b) => a.low - b.low || a.high - b.high,
      ),
    });
  }

  return { roundNumber, opponentByTeam, homeTableByTeam, excludedTeams, triples };
}
