import "server-only";

import { eq } from "drizzle-orm";
import { Db } from "@/db/games";
import { boards as pairsBoards } from "@/db/games/tables/boards";
import { findPairs } from "@/db/games/queries/find-pairs";
import { findTeams } from "@/db/games/queries/find-teams";
import {
  boardResult,
  teamIdFor,
  type TeamMatchRow,
} from "@/scoring/swiss/team-match";
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
 * Reconstructs the board's matches (and any three-way triple) from its rows
 * with the shared, tested {@link groupTeamMatches}/{@link groupTeamTriples}
 * reconstruction — each two-table match spans the home team's table (open room)
 * and the opponent's (closed room), keyed on the lower table number. Team names
 * come from {@link findTeams} (keyed by home NS seat), matching the leaderboard.
 * The per-board net IMP margin (home team's perspective) is included for a
 * two-team match; a triple carries no single head-to-head margin.
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

  // Group this board's rows by the unordered team pair they belong to. Each
  // pair is one head-to-head comparison — its two rooms share this board, with
  // the home room at the lower table (that team NS) and the opponent room at
  // the higher. This frames EVERY teams encounter the same way: an ordinary
  // two-team match, a short triple's x-y/y-z/z-x comparison (each on its own
  // board set, so only one touches this board), and a long triple's comparison
  // (whose two rooms share this board across its two rounds). A triple is thus
  // shown as three ordinary two-team cards (one per board set), never a single
  // three-way card. SIT_OUT / HALF_AVERAGE rows carry a phantom opponent and
  // are already filtered out upstream.
  const byPair = new Map<string, { section: string; lo: number; hi: number }>();
  for (const row of rows) {
    let home: number;
    let opp: number;
    try {
      home = parseSeat(row.ns).tableNumber;
      opp = parseSeat(row.ew).tableNumber;
    } catch {
      // A non-seat id (e.g. a phantom) is not a real team room; skip it.
      continue;
    }
    const lo = Math.min(home, opp);
    const hi = Math.max(home, opp);
    byPair.set(`${row.section}|${lo}-${hi}`, { section: row.section, lo, hi });
  }

  /** This board's final score for the team NS at `table` in `section`, else null. */
  const scoreAt = (section: string, table: number): number | null => {
    const row = rows.find((r) => {
      if (r.section !== section) return false;
      try {
        return parseSeat(r.ns).tableNumber === table;
      } catch {
        return false;
      }
    });
    if (!row) return null;
    const outcome = boardResult(row);
    return outcome != null ? outcomeToScore(boardNumber, outcome) : null;
  };

  const result: TeamTravellerMatch[] = [];
  for (const { section, lo, hi } of [...byPair.values()].sort(
    (a, b) =>
      (a.section < b.section ? -1 : a.section > b.section ? 1 : 0) ||
      a.lo - b.lo ||
      a.hi - b.hi,
  )) {
    const loScore = scoreAt(section, lo);
    const hiScore = scoreAt(section, hi);
    // Net IMP margin from the lower (primary) team's perspective; null until
    // both rooms have a comparable scored result on this board.
    const margin =
      loScore != null && hiScore != null
        ? computeImps(loScore - hiScore)
        : null;

    const loId = teamIdFor(section, lo);
    const hiId = teamIdFor(section, hi);
    result.push({
      tables: [lo, hi],
      teams: [
        { table: lo, id: loId, name: nameFor(loId) },
        { table: hi, id: hiId, name: nameFor(hiId) },
      ],
      margin,
    });
  }

  return result;
}
