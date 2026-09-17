import { BoardOutcome } from "@/model/score";
import { parseSeat } from "@/model/participants";
import { outcomeToScore, computeImps } from "@/scoring/traveller/common";

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

  // Index each home table's rows by (section, round, homeTable).
  const homeTables = new Map<string, HomeEntry>();
  for (const row of rows) {
    if (row.status === "SIT_OUT") continue;

    const nsSeat = parseSeat(row.ns);
    const ewSeat = parseSeat(row.ew);
    const homeTable = nsSeat.tableNumber;
    const opponentTable = ewSeat.tableNumber;

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

  const ordered = Array.from(homeTables.values()).sort(
    (a, b) =>
      a.round - b.round ||
      (a.section < b.section ? -1 : a.section > b.section ? 1 : 0) ||
      a.homeTable - b.homeTable,
  );

  const matches: TeamMatch<R>[] = [];
  const processed = new Set<string>();

  for (const entry of ordered) {
    const { section, round, homeTable, opponentTable } = entry;
    // Process each unordered match once, keyed on the lower home table.
    if (homeTable >= opponentTable) continue;

    const key = `${section}|${round}|${homeTable}`;
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
  const boardNumbers = Array.from(
    new Set([
      ...match.homeRowsByBoard.keys(),
      ...match.opponentRowsByBoard.keys(),
    ]),
  ).sort((a, b) => a - b);

  const scoreOf = (row: R | undefined): number | null => {
    if (!row) return null;
    const outcome = boardResult(row);
    return outcome != null ? outcomeToScore(row.boardNumber, outcome) : null;
  };

  let margin = 0;
  let boardsPlayed = 0;
  const perBoard: TeamMatchBoardImp[] = [];

  for (const boardNumber of boardNumbers) {
    const homeScore = scoreOf(match.homeRowsByBoard.get(boardNumber));
    const awayScore = scoreOf(match.opponentRowsByBoard.get(boardNumber));

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
