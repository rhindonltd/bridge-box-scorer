import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import { Db } from "@/db/games";
import { boards as pairsBoards } from "@/db/games/tables/boards";
import { matches } from "@/db/games/tables/matches";
import { buildPerBoardPlayerLookup } from "@/db/games/queries/assignment-players";
import { findTeams } from "@/db/games/queries/find-teams";
import { boardResult, type TeamMatchRow } from "@/scoring/swiss/team-match";
import { outcomeToScore, computeImps } from "@/scoring/traveller/common";
import { parseSeat } from "@/model/participants";
import type { TeamTravellerMatch } from "@/model/participants";
import { readAbsences } from "@/db/games/queries/absences";
import { resolveAbsentRow } from "@/model/absence";
import { applySeatSwaps } from "@/model/seat-swap";

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
  // A board the director marked "played the wrong way round" is shown with its
  // ns/ew pair ids exchanged (the result is unchanged; it is credited to the
  // opposite pairs). Applied first so absence resolution and name lookup below
  // both work from the credited pairs.
  const records = applySeatSwaps(
    (
      await db
        .select()
        .from(pairsBoards)
        .where(eq(pairsBoards.boardNumber, boardNumber))
    ).filter((b) => !NON_TRAVELLER_STATUSES.has(b.status ?? "")),
  );

  // Design §11: a row missed because a pair is absent shows as it is scored —
  // the AVE± artificial result under AVERAGE, or not at all under REMOVED (it
  // is out of the movement).
  //
  // Two kinds of missed row: an ABSENT row (a pair withdrew or arrived late;
  // marked when it happened), and a row against a still-EMPTY expected-late
  // seat (nobody sits there yet, so it stays NOT_PLAYED and the leaderboard
  // scores it as absent on the fly). Both must read the same on the traveller
  // as on the leaderboard. Only EMPTY absences are applied to non-ABSENT rows,
  // so every other (teams / Swiss) traveller is untouched.
  const absences = await readAbsences(db);
  const emptyOnly = new Map(
    [...absences].filter(([, absence]) => absence.kind === "EMPTY"),
  );
  const shown: {
    row: (typeof records)[number];
    absentResult: string | null;
  }[] = [];
  for (const row of records) {
    const resolution = resolveAbsentRow(
      row,
      row.status === "ABSENT" ? absences : emptyOnly,
    );
    if (resolution?.kind === "removed") continue;
    shown.push({
      row,
      absentResult: resolution?.kind === "outcome" ? resolution.outcome : null,
    });
  }

  // Resolve names PER BOARD (keyed by the board id on `b.ns`/`b.ew`, matching
  // the seat/anchor id), so a §2.4.7 handover seat shows the stand-in's names on
  // the boards it played and the real pair's names on theirs — not one pair for
  // the whole seat. For every ordinary (single-occupancy) seat this is the same
  // pair on every board.
  const resolvePair = await buildPerBoardPlayerLookup(db);
  const nameOf = (boardId: string, boardNumber: number): string | null => {
    const pair = resolvePair(boardId, boardNumber);
    if (!pair) return null;
    return `${pair.player1.firstName} ${pair.player1.lastName} & ${pair.player2.firstName} ${pair.player2.lastName}`;
  };

  return shown.map(({ row: b, absentResult }) => ({
    roundNumber: b.roundNumber,
    tableNumber: b.tableNumber,
    boardNumber: b.boardNumber,
    participants: {
      type: "PAIRS" as const,
      ns: b.ns,
      ew: b.ew,
      nsNames: nameOf(b.ns, b.boardNumber),
      ewNames: nameOf(b.ew, b.boardNumber),
    },
    currentResult:
      b.directorOverrideResult ?? b.confirmedResult ?? absentResult ?? null,
    status: b.status ?? null,
    // Lets the director's traveller offer "Mark played reversed" / "Clear".
    seatsSwapped: b.seatsSwapped,
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
      seatsSwapped: pairsBoards.seatsSwapped,
    })
    .from(pairsBoards)
    .where(eq(pairsBoards.boardNumber, boardNumber))) as (TeamMatchRow & {
    matchId: number;
    seatsSwapped: boolean;
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

  /**
   * This board's score for `teamId`, taken from the table whose recorded NS
   * seat is `teamId`, else null.
   *
   * If the director marked that table "played the wrong way round", the team
   * actually held the EW hands there, so the NS-hand score is credited to its
   * opponents: the team's score is the negation. (This is the same transform as
   * `applySeatSwaps`, expressed from the team's perspective so the lookup by
   * recorded seat still finds the room.)
   */
  const scoreForTeam = (teamId: string): number | null => {
    const row = rows.find((r) => r.ns === teamId);
    if (!row) return null;
    const outcome = boardResult(row);
    if (outcome == null) return null;
    const score = outcomeToScore(boardNumber, outcome);
    if (score == null) return null;
    return row.seatsSwapped ? -score : score;
  };

  const result: TeamTravellerMatch[] = [];
  for (const m of matchRows) {
    // A teams/triple match always has both participants (opponent non-null).
    /* v8 ignore next -- unreachable: the query filters to TEAMS/TRIPLE kinds, which always carry an opponent (only BYE has none) */
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
