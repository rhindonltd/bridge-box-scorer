import { BoardOutcome } from "@/model/score";
import { parseSeat } from "@/model/participants";
import {
  outcomeToScore,
  computeImps,
  computeCrossImps,
} from "@/scoring/traveller/common";

/**
 * The ascending union of the board numbers keyed in the given rows-by-board
 * maps. Used to span every board any room/table of a match or triangle has a
 * row for, so a per-board list can be emitted even when only one side has
 * played a board yet.
 */
export function unionBoardNumbers(
  ...maps: Map<number, unknown>[]
): number[] {
  const nums = new Set<number>();
  for (const map of maps) {
    for (const n of map.keys()) nums.add(n);
  }
  return Array.from(nums).sort((a, b) => a - b);
}

/**
 * The canonical ordering for matches/triangles: by round, then section
 * (lexicographic), then the lowest table number. Callers pass the table key
 * they order on (a match's home table, a triangle's lowest table).
 */
export function compareByRoundSectionTable(
  a: { round: number; section: string; table: number },
  b: { round: number; section: string; table: number },
): number {
  return (
    a.round - b.round ||
    (a.section < b.section ? -1 : a.section > b.section ? 1 : 0) ||
    a.table - b.table
  );
}

/**
 * The minimal board-row shape the Swiss Teams match reconstruction needs. Kept
 * structural (rather than importing the Drizzle `Board` type) so this stays a
 * pure module unit tests can drive with plain objects — and so both the pure
 * scorer (`SwissVpBoardRow`) and the USEBIO exporter (the Drizzle `Board`,
 * which carries extra fields like leads) can use it. The reconstruction
 * preserves each row's concrete type via the generic `R`, so a `Board`-typed
 * caller keeps access to its own extra fields on the grouped rows.
 */
export interface TeamMatchRow {
  section: string;
  roundNumber: number;
  boardNumber: number;
  ns: string;
  ew: string;
  confirmedResult: BoardOutcome | null;
  directorOverrideResult: BoardOutcome | null;
  status: string | null;
}

/**
 * One reconstructed Swiss Teams match: the two home tables (open + closed room)
 * that make up a team-vs-team encounter in one round.
 *
 * `homeTable` is always the lower of the two table numbers (the canonical
 * "primary" side), so a match is emitted exactly once. The primary team sits NS
 * at its own home table (`homeRows`) and EW at the opponent's home table
 * (`opponentRows`); each side's rows are keyed by board number.
 */
export interface TeamMatch<R extends TeamMatchRow> {
  section: string;
  round: number;
  homeTable: number;
  opponentTable: number;
  homeTeamId: string;
  opponentTeamId: string;
  homeRowsByBoard: Map<number, R>;
  opponentRowsByBoard: Map<number, R>;
}

/** The final result on a board: a director override wins over the confirmed. */
export function boardResult(row: TeamMatchRow): BoardOutcome | null {
  return row.directorOverrideResult ?? row.confirmedResult;
}

/**
 * A team's stable id is its home NS seat (e.g. "A1NS") — the same id
 * `findTeams` assigns and the leaderboard highlights on. Built from the section
 * and the home table number.
 */
export function teamIdFor(section: string, homeTable: number): string {
  return `${section}${homeTable}NS`;
}

/**
 * Reconstruct the Swiss Teams matches from a game's board rows.
 *
 * A team match spans two home tables in the same (section, round): at each
 * table the NS seat is that table's home team and the EW seat encodes the
 * opponent's home table (its away pair travelled there). Rows are indexed by
 * `(section, round, homeTable)`, then each home table is paired with its
 * opponent's home table and the unordered match is emitted once — keyed on the
 * lower table number, which becomes the match's primary `homeTable`.
 *
 * SIT_OUT rows are skipped (Swiss Teams has no byes, but the guard keeps the
 * function total). Matches are returned ordered by round, then section, then
 * home table — the order both the scorer's crediting and the USEBIO export rely
 * on.
 */
export function groupTeamMatches<R extends TeamMatchRow>(
  rows: R[],
): TeamMatch<R>[] {
  interface HomeEntry {
    section: string;
    round: number;
    homeTable: number;
    opponentTable: number;
    rowsByBoard: Map<number, R>;
  }

  // Triangle tables score cross-IMP across three tables (see groupTeamTriangles),
  // not as two-table head-to-heads, so exclude them here to avoid mis-pairing.
  const triangleTables = triangleTableKeys(rows);

  // Index each home table's rows by (section, round, homeTable).
  const homeTables = new Map<string, HomeEntry>();
  for (const row of rows) {
    if (row.status === "SIT_OUT") continue;

    const nsSeat = parseSeat(row.ns);
    const ewSeat = parseSeat(row.ew);
    const homeTable = nsSeat.tableNumber;
    const opponentTable = ewSeat.tableNumber;

    if (triangleTables.has(`${row.section}|${row.roundNumber}|${homeTable}`)) {
      continue;
    }

    const key = `${row.section}|${row.roundNumber}|${homeTable}`;
    const entry =
      homeTables.get(key) ??
      ({
        section: row.section,
        round: row.roundNumber,
        homeTable,
        opponentTable,
        rowsByBoard: new Map<number, R>(),
      } satisfies HomeEntry);
    entry.rowsByBoard.set(row.boardNumber, row);
    homeTables.set(key, entry);
  }

  const ordered = Array.from(homeTables.values()).sort((a, b) =>
    compareByRoundSectionTable(
      { round: a.round, section: a.section, table: a.homeTable },
      { round: b.round, section: b.section, table: b.homeTable },
    ),
  );

  const matches: TeamMatch<R>[] = [];
  const processed = new Set<string>();

  for (const entry of ordered) {
    const { section, round, homeTable, opponentTable } = entry;
    // Process each unordered match once, keyed on the lower home table.
    if (homeTable >= opponentTable) continue;

    const key = `${section}|${round}|${homeTable}`;
    /* v8 ignore next -- defensive: homeTables is keyed by this exact (section,round,homeTable) string so each entry is unique; the dedup guard never actually fires */
    if (processed.has(key)) continue;
    processed.add(key);

    const other = homeTables.get(`${section}|${round}|${opponentTable}`);

    matches.push({
      section,
      round,
      homeTable,
      opponentTable,
      homeTeamId: teamIdFor(section, homeTable),
      opponentTeamId: teamIdFor(section, opponentTable),
      homeRowsByBoard: entry.rowsByBoard,
      opponentRowsByBoard: other?.rowsByBoard ?? new Map<number, R>(),
    });
  }

  return matches;
}

/** One board's net IMPs from the primary team's perspective. */
export interface TeamMatchBoardImp {
  boardNumber: number;
  /** Net IMPs (home NS score − opponent NS score); null when not comparable. */
  imps: number | null;
}

/**
 * The per-board net IMPs (from the primary/home team's perspective), the summed
 * IMP margin, and the number of boards that counted, for one team match.
 *
 * A board counts only when BOTH rooms have a comparable scored result (a
 * pass-out / not-played / unentered board maps to a null score and is skipped).
 * The per-board list spans every board either room has a row for, in ascending
 * board order, so the USEBIO export can emit a traveller entry per board even
 * when only one room has played it yet.
 */
export function teamMatchBoardImps<R extends TeamMatchRow>(
  match: TeamMatch<R>,
): { perBoard: TeamMatchBoardImp[]; margin: number; boardsPlayed: number } {
  const boardNumbers = unionBoardNumbers(
    match.homeRowsByBoard,
    match.opponentRowsByBoard,
  );

  let margin = 0;
  let boardsPlayed = 0;
  const perBoard: TeamMatchBoardImp[] = [];

  for (const boardNumber of boardNumbers) {
    const homeScore = scoreOfRow(match.homeRowsByBoard.get(boardNumber));
    const awayScore = scoreOfRow(match.opponentRowsByBoard.get(boardNumber));

    if (homeScore != null && awayScore != null) {
      const imps = computeImps(homeScore - awayScore);
      margin += imps;
      boardsPlayed += 1;
      perBoard.push({ boardNumber, imps });
    } else {
      perBoard.push({ boardNumber, imps: null });
    }
  }

  return { perBoard, margin, boardsPlayed };
}

/** One board's Board-a-Match result from the primary/home team's perspective. */
export interface TeamMatchBoardWin {
  boardNumber: number;
  /**
   * Board-a-Match result for the home team: 1 for a win, 0.5 for a tie, 0 for
   * a loss; null when the board is not comparable (only one room has a scored
   * result, or a pass-out / not-played board).
   */
  result: number | null;
}

/**
 * The per-board Board-a-Match results (from the primary/home team's
 * perspective), the total boards won (halves for ties), and the number of
 * boards that counted, for one team match.
 *
 * Board-a-Match treats each board as its own match: the team with the higher
 * score wins the board (1), an equal score is a tie (0.5 each), and the lower
 * score loses (0). A board counts only when BOTH rooms have a comparable scored
 * result — mirroring {@link teamMatchBoardImps}, which shares the same
 * comparability rule so the two functions never disagree about which boards are
 * played. The per-board list spans every board either room has a row for, in
 * ascending board order.
 */
export function teamMatchBoardWins<R extends TeamMatchRow>(
  match: TeamMatch<R>,
): { perBoard: TeamMatchBoardWin[]; won: number; boardsPlayed: number } {
  const boardNumbers = unionBoardNumbers(
    match.homeRowsByBoard,
    match.opponentRowsByBoard,
  );

  let won = 0;
  let boardsPlayed = 0;
  const perBoard: TeamMatchBoardWin[] = [];

  for (const boardNumber of boardNumbers) {
    const homeScore = scoreOfRow(match.homeRowsByBoard.get(boardNumber));
    const awayScore = scoreOfRow(match.opponentRowsByBoard.get(boardNumber));

    if (homeScore != null && awayScore != null) {
      const result = homeScore > awayScore ? 1 : homeScore < awayScore ? 0 : 0.5;
      won += result;
      boardsPlayed += 1;
      perBoard.push({ boardNumber, result });
    } else {
      perBoard.push({ boardNumber, result: null });
    }
  }

  return { perBoard, won, boardsPlayed };
}

/** One team's bye round, recovered from a section's SIT_OUT board rows. */
export interface TeamByeRound {
  /** The bye team's stable id (its home NS seat, e.g. "A3NS"). */
  teamId: string;
  round: number;
  /** How many boards that round would have carried (for the average credit). */
  boards: number;
}

/**
 * Recover the team byes from a game's board rows.
 *
 * A Swiss Teams bye is written as SIT_OUT rows on the bye team's home table:
 * the NS seat is the bye team (e.g. "A3NS") and the EW seat is a phantom. These
 * rows are skipped by {@link groupTeamMatches} (they are not a real match), so
 * the teams overall scorers use this to credit the sitting team an average-plus
 * result for the round. One entry per (section, round, home table), with the
 * board count taken from the distinct board numbers of that bye's rows.
 */
export function teamByeRounds<R extends TeamMatchRow>(
  rows: R[],
): TeamByeRound[] {
  // Group SIT_OUT rows by (section, round, home table); count distinct boards.
  const byes = new Map<
    string,
    { teamId: string; round: number; boards: Set<number> }
  >();

  for (const row of rows) {
    if (row.status !== "SIT_OUT") continue;

    let homeTable: number;
    try {
      homeTable = parseSeat(row.ns).tableNumber;
    } catch {
      // A non-seat NS id (should not occur) is skipped.
      continue;
    }

    const key = `${row.section}|${row.roundNumber}|${homeTable}`;
    const entry = byes.get(key) ?? {
      teamId: teamIdFor(row.section, homeTable),
      round: row.roundNumber,
      boards: new Set<number>(),
    };
    entry.boards.add(row.boardNumber);
    byes.set(key, entry);
  }

  return Array.from(byes.values()).map((b) => ({
    teamId: b.teamId,
    round: b.round,
    boards: b.boards.size,
  }));
}

/* =========================================================================
   TRIANGLES (three-way matches for an odd field)

   A triangle is three teams A<B<C playing a three-way over a round's whole
   board set, seated in a fixed cycle so every team meets both others:
     - table A: A home pair (NS) vs B away pair (EW)
     - table B: B home pair (NS) vs C away pair (EW)
     - table C: C home pair (NS) vs A away pair (EW)
   Unlike a two-table head-to-head (where the two tables reference each other
   MUTUALLY via their EW seats), a triangle's EW references form a directed
   3-CYCLE (A→B→C→A) and are never mutual. That asymmetry is exactly how a
   triangle is told apart from an ordinary match here.

   Scoring is cross-IMP / board comparison across the three tables: on each
   board, a team is compared against BOTH other tables (not one opponent room),
   so the two-table `teamMatchBoardImps` / `teamMatchBoardWins` do not apply.
   ========================================================================= */

/** One table of a triangle: its home team and that table's rows by board. */
interface TriangleTable<R extends TeamMatchRow> {
  table: number;
  teamId: string;
  rowsByBoard: Map<number, R>;
}

/**
 * One reconstructed three-way triangle: the three home tables (in ascending
 * table order) that make up a three-team encounter in one round.
 */
export interface TeamTriangle<R extends TeamMatchRow> {
  section: string;
  round: number;
  /** The three tables in ascending order, each with its home team's rows. */
  tables: [TriangleTable<R>, TriangleTable<R>, TriangleTable<R>];
}

/** A home table's opponent reference for one (section, round). */
interface TableEdge {
  section: string;
  round: number;
  homeTable: number;
  opponentTable: number;
}

/**
 * Index the non-SIT_OUT rows into one edge per (section, round, homeTable): the
 * home team (NS seat) and the single opponent it references (EW seat). A home
 * table faces exactly one opponent seat per round in every movement (two-team
 * or triangle), so the last EW seen is authoritative. Rows whose seats don't
 * parse (e.g. a phantom) are skipped.
 */
function indexTableEdges<R extends TeamMatchRow>(
  rows: R[],
): Map<string, TableEdge> {
  const edges = new Map<string, TableEdge>();
  for (const row of rows) {
    if (row.status === "SIT_OUT") continue;
    let homeTable: number;
    let opponentTable: number;
    try {
      homeTable = parseSeat(row.ns).tableNumber;
      opponentTable = parseSeat(row.ew).tableNumber;
    } catch {
      continue;
    }
    edges.set(`${row.section}|${row.roundNumber}|${homeTable}`, {
      section: row.section,
      round: row.roundNumber,
      homeTable,
      opponentTable,
    });
  }
  return edges;
}

/**
 * The set of `(section|round|table)` keys that belong to a triangle, so
 * {@link groupTeamMatches} can exclude them.
 *
 * A triangle is three tables in the same (section, round) whose EW opponent
 * references form a directed 3-cycle (x→y→z→x) with none of them mutual. A
 * two-table match is mutual (x→y and y→x) and never matches this shape.
 */
function triangleTableKeys<R extends TeamMatchRow>(rows: R[]): Set<string> {
  const edges = indexTableEdges(rows);
  const keys = new Set<string>();

  for (const edge of edges.values()) {
    const { section, round, homeTable } = edge;
    const self = `${section}|${round}|${homeTable}`;
    if (keys.has(self)) continue;

    // Follow the EW references three hops; a triangle returns to the start
    // through three DISTINCT tables (x→y→z→x).
    const y = edges.get(`${section}|${round}|${edge.opponentTable}`);
    if (!y || y.opponentTable === homeTable) continue; // mutual = two-team match
    const z = edges.get(`${section}|${round}|${y.opponentTable}`);
    if (!z) continue;

    if (
      z.opponentTable === homeTable &&
      new Set([homeTable, y.homeTable, z.homeTable]).size === 3
    ) {
      keys.add(`${section}|${round}|${homeTable}`);
      keys.add(`${section}|${round}|${y.homeTable}`);
      keys.add(`${section}|${round}|${z.homeTable}`);
    }
  }

  return keys;
}

/**
 * Reconstruct the three-way triangles from a game's board rows.
 *
 * Detects each directed 3-cycle of tables (see {@link triangleTableKeys}) and
 * emits one {@link TeamTriangle} per triangle, with its three tables in
 * ascending table order and each table's rows keyed by board. Triangles are
 * returned ordered by round, then section, then lowest table — matching the
 * ordering convention of {@link groupTeamMatches}.
 */
export function groupTeamTriangles<R extends TeamMatchRow>(
  rows: R[],
): TeamTriangle<R>[] {
  const triangleKeys = triangleTableKeys(rows);
  if (triangleKeys.size === 0) return [];

  // Accumulate rows-by-board for every triangle table.
  const tableRows = new Map<
    string,
    { section: string; round: number; table: number; rowsByBoard: Map<number, R> }
  >();

  for (const row of rows) {
    if (row.status === "SIT_OUT") continue;
    let homeTable: number;
    try {
      homeTable = parseSeat(row.ns).tableNumber;
    } catch {
      continue;
    }
    const key = `${row.section}|${row.roundNumber}|${homeTable}`;
    if (!triangleKeys.has(key)) continue;

    const entry =
      tableRows.get(key) ??
      {
        section: row.section,
        round: row.roundNumber,
        table: homeTable,
        rowsByBoard: new Map<number, R>(),
      };
    entry.rowsByBoard.set(row.boardNumber, row);
    tableRows.set(key, entry);
  }

  // Group the triangle tables by (section, round); each such group is exactly
  // one triangle of three tables.
  const groups = new Map<
    string,
    { section: string; round: number; tables: TriangleTable<R>[] }
  >();
  for (const entry of tableRows.values()) {
    const groupKey = `${entry.round}|${entry.section}`;
    const group =
      groups.get(groupKey) ??
      { section: entry.section, round: entry.round, tables: [] };
    group.tables.push({
      table: entry.table,
      teamId: teamIdFor(entry.section, entry.table),
      rowsByBoard: entry.rowsByBoard,
    });
    groups.set(groupKey, group);
  }

  const triangles: TeamTriangle<R>[] = [];
  for (const group of groups.values()) {
    const tables = group.tables.sort((a, b) => a.table - b.table);
    /* v8 ignore next -- a detected triangle always has exactly three tables */
    if (tables.length !== 3) continue;
    triangles.push({
      section: group.section,
      round: group.round,
      tables: [tables[0], tables[1], tables[2]],
    });
  }

  // Order by round, then section, then lowest table.
  return triangles.sort((a, b) =>
    compareByRoundSectionTable(
      { round: a.round, section: a.section, table: a.tables[0].table },
      { round: b.round, section: b.section, table: b.tables[0].table },
    ),
  );
}

/** One team's cross-IMP result across a triangle round. */
export interface TriangleTeamImps {
  teamId: string;
  /** Summed cross-IMPs vs the other two tables over the counted boards. */
  crossImps: number;
  /** Boards where all three tables have a comparable scored result. */
  boardsPlayed: number;
}

/**
 * Score a triangle cross-IMP (Butler): on each board where ALL THREE tables
 * have a comparable scored result, each team's board cross-IMPs are the sum of
 * the IMP difference of its score against EACH of the other two tables' scores
 * (via {@link computeCrossImps}). A team's round total is the sum over the
 * counted boards. Returns one entry per team (in the triangle's table order)
 * plus the shared count of boards played.
 *
 * A board where any table has no comparable score (pass-out / not-played /
 * unentered) is skipped for every team, so all three stay on the same board
 * set — the running estimate simply grows as results come in.
 */
export function triangleTeamImps<R extends TeamMatchRow>(
  triangle: TeamTriangle<R>,
): { perTeam: TriangleTeamImps[]; boardsPlayed: number } {
  const [t0, t1, t2] = triangle.tables;
  const boardNumbers = triangleBoardNumbers(triangle);

  const perTeam: TriangleTeamImps[] = triangle.tables.map((t) => ({
    teamId: t.teamId,
    crossImps: 0,
    boardsPlayed: 0,
  }));

  let boardsPlayed = 0;

  for (const boardNumber of boardNumbers) {
    const s0 = scoreOfRow(t0.rowsByBoard.get(boardNumber));
    const s1 = scoreOfRow(t1.rowsByBoard.get(boardNumber));
    const s2 = scoreOfRow(t2.rowsByBoard.get(boardNumber));
    if (s0 == null || s1 == null || s2 == null) continue;

    boardsPlayed += 1;
    perTeam[0].crossImps += computeCrossImps(s0, [s1, s2]);
    perTeam[1].crossImps += computeCrossImps(s1, [s0, s2]);
    perTeam[2].crossImps += computeCrossImps(s2, [s0, s1]);
  }

  for (const team of perTeam) team.boardsPlayed = boardsPlayed;
  return { perTeam, boardsPlayed };
}

/** One team's board-comparison result across a triangle round. */
export interface TriangleTeamWins {
  teamId: string;
  /**
   * Board-comparison points won: on each counted board, 1 for beating another
   * table / 0.5 for a tie / 0 for losing, SUMMED over BOTH other tables (so up
   * to 2 per board). Native board units; the BAM (×1) / PAB (×2) scale is
   * applied only at display, matching the two-team board-comparison scorer.
   */
  won: number;
  /** Boards where all three tables have a comparable scored result. */
  boardsPlayed: number;
}

/**
 * Score a triangle by board comparison: on each board where ALL THREE tables
 * have a comparable scored result, each team compares its score against EACH of
 * the other two tables (win 1 / tie 0.5 / loss 0) and sums the two, so a team
 * can win up to 2 board-points per board. A team's round total is the sum over
 * the counted boards. Mirrors {@link triangleTeamImps}'s comparability rule so
 * the VP and board-comparison views never disagree about which boards counted.
 */
export function triangleTeamWins<R extends TeamMatchRow>(
  triangle: TeamTriangle<R>,
): { perTeam: TriangleTeamWins[]; boardsPlayed: number } {
  const [t0, t1, t2] = triangle.tables;
  const boardNumbers = triangleBoardNumbers(triangle);

  const perTeam: TriangleTeamWins[] = triangle.tables.map((t) => ({
    teamId: t.teamId,
    won: 0,
    boardsPlayed: 0,
  }));

  let boardsPlayed = 0;

  const wl = (me: number, other: number): number =>
    me > other ? 1 : me < other ? 0 : 0.5;

  for (const boardNumber of boardNumbers) {
    const s0 = scoreOfRow(t0.rowsByBoard.get(boardNumber));
    const s1 = scoreOfRow(t1.rowsByBoard.get(boardNumber));
    const s2 = scoreOfRow(t2.rowsByBoard.get(boardNumber));
    if (s0 == null || s1 == null || s2 == null) continue;

    boardsPlayed += 1;
    perTeam[0].won += wl(s0, s1) + wl(s0, s2);
    perTeam[1].won += wl(s1, s0) + wl(s1, s2);
    perTeam[2].won += wl(s2, s0) + wl(s2, s1);
  }

  for (const team of perTeam) team.boardsPlayed = boardsPlayed;
  return { perTeam, boardsPlayed };
}

/** The union of board numbers any of a triangle's three tables has a row for. */
function triangleBoardNumbers<R extends TeamMatchRow>(
  triangle: TeamTriangle<R>,
): number[] {
  return unionBoardNumbers(...triangle.tables.map((t) => t.rowsByBoard));
}

/** A table row's final score (override ?? confirmed), or null when unscored. */
function scoreOfRow<R extends TeamMatchRow>(row: R | undefined): number | null {
  if (!row) return null;
  const outcome = boardResult(row);
  return outcome != null ? outcomeToScore(row.boardNumber, outcome) : null;
}

/**
 * Decompose a triangle into its three pairwise HEAD-TO-HEAD match views, for
 * the USEBIO export only.
 *
 * A triangle is scored cross-IMP for the standings (see {@link triangleTeamImps}),
 * but USEBIO has no three-way tag: a three-way is written as three ordinary
 * `<MATCH>` nodes sharing one round. Each pairing X-Y (X < Y) is presented as a
 * conventional two-table encounter — table X is the home room (X-NS) and table
 * Y the other (Y-NS) — so the existing per-board IMP / board-comparison detail
 * and travellers can be emitted unchanged. These views are INFORMATIONAL: the
 * authoritative round result stays the cross-IMP total, not the sum of these
 * three head-to-head comparisons.
 *
 * Returns the three matches in ascending (homeTable, opponentTable) order.
 */
export function triangleSubMatches<R extends TeamMatchRow>(
  triangle: TeamTriangle<R>,
): TeamMatch<R>[] {
  const { section, round, tables } = triangle;
  const pairs: Array<[TriangleTable<R>, TriangleTable<R>]> = [
    [tables[0], tables[1]],
    [tables[0], tables[2]],
    [tables[1], tables[2]],
  ];

  return pairs.map(([home, away]) => ({
    section,
    round,
    homeTable: home.table,
    opponentTable: away.table,
    homeTeamId: teamIdFor(section, home.table),
    opponentTeamId: teamIdFor(section, away.table),
    homeRowsByBoard: home.rowsByBoard,
    opponentRowsByBoard: away.rowsByBoard,
  }));
}
