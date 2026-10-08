import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import { Db } from "@/db/games";
import { boards as pairsBoards } from "@/db/games/tables/boards";
import { matches } from "@/db/games/tables/matches";
import { findPairs } from "@/db/games/queries/find-pairs";
import { findTeams } from "@/db/games/queries/find-teams";
import { boardResult, type TeamMatchRow } from "@/scoring/swiss/team-match";
import { outcomeToScore, computeImps } from "@/scoring/traveller/common";
import { parseSeat } from "@/model/participants";
import type { TeamTravellerMatch } from "@/model/participants";

/**
 * Board statuses that are NOT a real played line and so never belong on a
 * traveller: a Swiss bye (`SIT_OUT`) and a Swiss Pairs "2 half matches"
 * compensation block (`HALF_AVERAGE`). Both carry a phantom opponent and no
 * played result, so including them would show a stray placeholder row (and let
 * a director tap a meaningless phantom row to "override"). The real half-match
 * lines (anchor vs each opponent on their own board subset) are ordinary rows
 * and are unaffected.
 */
const NON_TRAVELLER_STATUSES = new Set(["SIT_OUT", "HALF_AVERAGE"]);

export async function getBoardInstances(db: Db, boardNumber: number) {
  const records = (
    await db
      .select()
      .from(pairsBoards)
      .where(eq(pairsBoards.boardNumber, boardNumber))
  ).filter((b) => !NON_TRAVELLER_STATUSES.has(b.status ?? ""));

  const pairs = await findPairs(db);
  const pairNameMap = new Map<string, string>();
  for (const pair of pairs) {
    const names = `${pair.player1.firstName} ${pair.player1.lastName} & ${pair.player2.firstName} ${pair.player2.lastName}`;
    pairNameMap.set(pair.initialSeat, names);
  }

  return records.map((b) => ({
    roundNumber: b.roundNumber,
    tableNumber: b.tableNumber,
    boardNumber: b.boardNumber,
    participants: {
      type: "PAIRS" as const,
      ns: b.ns,
      ew: b.ew,
      nsNames: pairNameMap.get(b.ns) ?? null,
      ewNames: pairNameMap.get(b.ew) ?? null,
    },
    currentResult: b.directorOverrideResult ?? b.confirmedResult ?? null,
    status: b.status ?? null,
  }));
}

/**
 * Build the team-match framing for a single board (Swiss Teams / Teams Round
 * Robin), so the director traveller can present the flat per-table rows as
 * team-vs-team cards.
 *
 * Reads the board's TEAMS / TRIPLE {@link matches} rows directly — the match
 * table is authoritative for "which two teams met over this board" — rather
 * than re-inferring the pairing from the board seatings. Each such match is one
 * head-to-head comparison (an ordinary encounter, or one of a triple's three),
 * `home`/`opponent` naming the two teams as their stable home-NS seat ids. Team
 * names come from {@link findTeams} (keyed by that id), matching the
 * leaderboard. The per-board net IMP margin (home team's perspective) is
 * computed from the two rooms' scores on this board.
 *
 * Returns an empty array when the board belongs to no teams match (e.g. a pairs
 * game, or a board not yet materialized), so callers can treat "no framing" as
 * "render as plain rows".
 */
export async function buildTeamTravellerMatches(
  db: Db,
  boardNumber: number,
): Promise<TeamTravellerMatch[]> {
  // The board's rows (any room), used both to find the match ids this board
  // belongs to and to read each room's score for the margin.
  const rows = (await db
    .select({
      section: pairsBoards.section,
      roundNumber: pairsBoards.roundNumber,
      tableNumber: pairsBoards.tableNumber,
      boardNumber: pairsBoards.boardNumber,
      ns: pairsBoards.ns,
      ew: pairsBoards.ew,
      confirmedResult: pairsBoards.confirmedResult,
      directorOverrideResult: pairsBoards.directorOverrideResult,
      status: pairsBoards.status,
      matchId: pairsBoards.matchId,
    })
    .from(pairsBoards)
    .where(eq(pairsBoards.boardNumber, boardNumber))) as (TeamMatchRow & {
    matchId: number;
  })[];

  if (rows.length === 0) return [];

  // The teams-scored matches this board belongs to (one head-to-head each).
  const matchIds = [...new Set(rows.map((r) => r.matchId))];
  const matchRows = await db
    .select()
    .from(matches)
    .where(
      and(
        inArray(matches.id, matchIds),
        inArray(matches.kind, ["TEAMS", "TRIPLE"]),
      ),
    );

  if (matchRows.length === 0) return [];

  const teams = await findTeams(db);
  const nameById = new Map(teams.map((t) => [t.id, t.name]));
  const nameFor = (teamId: string) => nameById.get(teamId) ?? teamId;

  /** This board's final score at the table whose NS seat is `teamId`, else null. */
  const scoreForTeam = (teamId: string): number | null => {
    const row = rows.find((r) => r.ns === teamId);
    if (!row) return null;
    const outcome = boardResult(row);
    return outcome != null ? outcomeToScore(boardNumber, outcome) : null;
  };

  const result: TeamTravellerMatch[] = [];
  for (const m of matchRows) {
    // A teams/triple match always has both participants (opponent non-null).
    if (m.opponent == null) continue;
    const homeTable = parseSeat(m.home).tableNumber;
    const oppTable = parseSeat(m.opponent).tableNumber;

    const homeScore = scoreForTeam(m.home);
    const oppScore = scoreForTeam(m.opponent);
    // Net IMP margin from the home (primary) team's perspective; null until
    // both rooms have a comparable scored result on this board.
    const margin =
      homeScore != null && oppScore != null
        ? computeImps(homeScore - oppScore)
        : null;

    result.push({
      tables: [homeTable, oppTable],
      teams: [
        { table: homeTable, id: m.home, name: nameFor(m.home) },
        { table: oppTable, id: m.opponent, name: nameFor(m.opponent) },
      ],
      margin,
    });
  }

  // Stable order: by home table, then opponent table (matches the old reducer's
  // lo→hi ordering, since home is always the lower-id team of the comparison).
  return result.sort(
    (a, b) => a.tables[0] - b.tables[0] || a.tables[1] - b.tables[1],
  );
}
