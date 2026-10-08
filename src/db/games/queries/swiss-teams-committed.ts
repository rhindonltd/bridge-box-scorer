import { Db } from "@/db/games";
import { boards } from "@/db/games/tables/boards";
import { and, eq, lt } from "drizzle-orm";
import { SectionLetter, parseSeat } from "@/model/participants";
import {
  teamOpponentKey,
  type TeamId,
} from "@/movement/swiss-teams/swiss-teams-pairing";
import { detectTriples, type TeamMatchRow } from "@/scoring/swiss/team-match";

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

/** Minimal row projection for the shared triple detector + opponent reduction. */
async function sectionRows(
  db: Db,
  section: SectionLetter,
  maxRoundExclusive?: number,
): Promise<
  { roundNumber: number; tableNumber: number; ns: string; ew: string; status: string | null }[]
> {
  const where =
    maxRoundExclusive != null
      ? and(eq(boards.section, section), lt(boards.roundNumber, maxRoundExclusive))
      : eq(boards.section, section);
  return db
    .select({
      roundNumber: boards.roundNumber,
      tableNumber: boards.tableNumber,
      ns: boards.ns,
      ew: boards.ew,
      status: boards.status,
    })
    .from(boards)
    .where(where);
}

/** A row shaped for {@link detectTriples} (reads section/round/ns/ew/status). */
function detectorRow(
  section: SectionLetter,
  r: { roundNumber: number; ns: string; ew: string; status: string | null },
): TeamMatchRow {
  return {
    section,
    roundNumber: r.roundNumber,
    boardNumber: 0,
    ns: r.ns,
    ew: r.ew,
    confirmedResult: null,
    directorOverrideResult: null,
    status: r.status,
  };
}

/** Safe home-table id of a seat string, or null when it is not a seat. */
function tableOf(seat: string): TeamId | null {
  try {
    return parseSeat(seat).tableNumber;
  } catch {
    return null;
  }
}

/**
 * The teams history over rounds `< maxRoundExclusive`, as the round-R draw saw
 * it: matchups played, byes taken, and triples entered (reusing `detectTriples`).
 */
export async function getSwissTeamsPriorHistory(
  db: Db,
  section: SectionLetter,
  maxRoundExclusive: number,
): Promise<SwissTeamsPriorHistory> {
  const rows = await sectionRows(db, section, maxRoundExclusive);

  const playedOpponents = new Set<string>();
  const hadBye = new Set<TeamId>();
  const detectorRows: TeamMatchRow[] = [];

  for (const row of rows) {
    if (row.status === "SIT_OUT") {
      const bye = tableOf(row.ns);
      if (bye != null) hadBye.add(bye);
      continue;
    }
    const home = tableOf(row.ns);
    const away = tableOf(row.ew);
    if (home != null && away != null) {
      playedOpponents.add(teamOpponentKey(home, away));
    }
    detectorRows.push(detectorRow(section, row));
  }

  const hadTriple = new Set<TeamId>();
  for (const t of detectTriples(detectorRows)) {
    for (const team of t.teams) hadTriple.add(team);
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
  /** Teams in a triple or on a bye this round — excluded from detection. */
  excludedTeams: Set<TeamId>;
}

/**
 * Read a teams round's committed opponents. A match row's NS seat is the home
 * team (its own table) and the EW seat encodes the opponent's home table. Teams
 * in this round's triple (via {@link detectTriples}) or on a bye (SIT_OUT) are
 * collected into `excludedTeams` and left OUT of `opponentByTeam`, so a mismatch
 * scan runs on the ordinary tables only.
 */
export async function getSwissTeamsCommittedRound(
  db: Db,
  section: SectionLetter,
  roundNumber: number,
): Promise<SwissTeamsCommittedRound> {
  // Detect triples needs rows up to and including this round (a long triple
  // spans two rounds), so read through `roundNumber`.
  const upToRows = await sectionRows(db, section, roundNumber + 1);
  const detectorRows = upToRows
    .filter((r) => r.status !== "SIT_OUT")
    .map((r) => detectorRow(section, r));

  const excludedTeams = new Set<TeamId>();
  for (const t of detectTriples(detectorRows)) {
    if (t.rounds.includes(roundNumber)) {
      for (const team of t.teams) excludedTeams.add(team);
    }
  }

  const opponentByTeam = new Map<TeamId, TeamId>();
  const homeTableByTeam = new Map<TeamId, number>();

  const roundRows = upToRows.filter((r) => r.roundNumber === roundNumber);
  for (const row of roundRows) {
    if (row.status === "SIT_OUT") {
      const bye = tableOf(row.ns);
      if (bye != null) excludedTeams.add(bye);
      continue;
    }
    const home = tableOf(row.ns);
    const away = tableOf(row.ew);
    if (home == null || away == null) continue;
    homeTableByTeam.set(home, row.tableNumber);
    // Only record ordinary head-to-head opponents; triple teams are excluded
    // below after the full round is read.
    opponentByTeam.set(home, away);
  }

  // Drop any excluded (triple/bye) team from the ordinary opponent map.
  for (const team of excludedTeams) {
    opponentByTeam.delete(team);
  }
  // Also drop a team whose recorded opponent is excluded (its table is part of
  // the triple from the opponent's side).
  for (const [team, opp] of [...opponentByTeam]) {
    if (excludedTeams.has(opp)) opponentByTeam.delete(team);
  }

  return { roundNumber, opponentByTeam, homeTableByTeam, excludedTeams };
}
