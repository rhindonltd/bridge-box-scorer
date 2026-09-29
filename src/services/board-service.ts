import "server-only";

import { eq } from "drizzle-orm";
import { Db } from "@/db/games";
import { boards as pairsBoards } from "@/db/games/tables/boards";
import { findPairs } from "@/db/games/queries/find-pairs";
import { findTeams } from "@/db/games/queries/find-teams";
import {
  groupTeamMatches,
  groupTeamTriangles,
  teamMatchBoardImps,
  type TeamMatchRow,
} from "@/scoring/swiss/team-match";
import type { TeamTravellerMatch } from "@/model/participants";

export async function getBoardInstances(db: Db, boardNumber: number) {
  const records = await db
    .select()
    .from(pairsBoards)
    .where(eq(pairsBoards.boardNumber, boardNumber));

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
 * Reconstructs the board's matches (and any three-way triangle) from its rows
 * with the shared, tested {@link groupTeamMatches}/{@link groupTeamTriangles}
 * reconstruction — each two-table match spans the home team's table (open room)
 * and the opponent's (closed room), keyed on the lower table number. Team names
 * come from {@link findTeams} (keyed by home NS seat), matching the leaderboard.
 * The per-board net IMP margin (home team's perspective) is included for a
 * two-team match; a triangle carries no single head-to-head margin.
 *
 * Returns an empty array when the board has no team structure (e.g. a pairs
 * game, or a board not yet materialized), so callers can treat "no framing" as
 * "render as plain rows".
 */
export async function buildTeamTravellerMatches(
  db: Db,
  boardNumber: number,
): Promise<TeamTravellerMatch[]> {
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
    })
    .from(pairsBoards)
    .where(eq(pairsBoards.boardNumber, boardNumber))) as TeamMatchRow[];

  if (rows.length === 0) return [];

  const teams = await findTeams(db);
  const nameById = new Map(teams.map((t) => [t.id, t.name]));
  const nameFor = (teamId: string) => nameById.get(teamId) ?? teamId;

  const result: TeamTravellerMatch[] = [];

  // Two-team head-to-head matches: home table (open room) vs opponent (closed).
  for (const match of groupTeamMatches(rows)) {
    // Single-board margin: teamMatchBoardImps spans this one board, so read the
    // margin directly (null when a room hasn't a comparable scored result yet).
    const { perBoard } = teamMatchBoardImps(match);
    const boardImp = perBoard.find((p) => p.boardNumber === boardNumber);

    result.push({
      tables: [match.homeTable, match.opponentTable],
      teams: [
        {
          table: match.homeTable,
          id: match.homeTeamId,
          name: nameFor(match.homeTeamId),
        },
        {
          table: match.opponentTable,
          id: match.opponentTeamId,
          name: nameFor(match.opponentTeamId),
        },
      ],
      margin: boardImp?.imps ?? null,
      triangle: false,
    });
  }

  // Three-way triangles: three tables, compared cross-IMP (no single margin).
  for (const tri of groupTeamTriangles(rows)) {
    result.push({
      tables: tri.tables.map((t) => t.table),
      teams: tri.tables.map((t) => ({
        table: t.table,
        id: t.teamId,
        name: nameFor(t.teamId),
      })),
      margin: null,
      triangle: true,
    });
  }

  return result;
}
