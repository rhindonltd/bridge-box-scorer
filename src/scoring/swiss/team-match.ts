import { BoardOutcome } from "@/model/score";
import { parseSeat } from "@/model/participants";
import { outcomeToScore, computeImps } from "@/scoring/traveller/common";
import {
  parseRemovedTeamsBoard,
  removedBoardNsSwing,
} from "@/model/teams-removed-board";
import { VoidCause, parseVoidMatch } from "@/model/teams-match-void";
import { MismatchRuling, parseMismatch } from "@/model/swiss-mismatch";

/**
 * The ascending union of the board numbers keyed in the given rows-by-board
 * maps. Used to span every board any room/table of a match or triple has a
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
 * The canonical ordering for matches/triples: by round, then section
 * (lexicographic), then the lowest table number. Callers pass the table key
 * they order on (a match's home table, a triple's lowest table).
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
 * The minimal `matches`-row shape the Swiss Teams structure readers consume.
 * Kept structural (not the Drizzle `Match` type) so this stays a pure module
 * unit tests can drive with plain objects. A TEAMS row is one ordinary
 * head-to-head; TRIPLE rows sharing a `groupId` are one three-way's three
 * comparisons; a BYE row is a sit-out. `home`/`opponent` are the two teams'
 * stable home-NS seat ids (e.g. "A1NS"); `vpPool` is 10 (SHORT triple half) or
 * 20 (ordinary / LONG triple).
 */
export interface TeamMatchStructureRow {
  section: string;
  roundNumber: number;
  kind: string;
  home: string;
  opponent: string | null;
  groupId: string | null;
  vpPool: number | null;
  boardStart: number;
  boardEnd: number;
  /**
   * The match-level director ruling, home-relative (`VOID:<cause>` /
   * `MM:<side>:<direction>:<fault>`), or null. Read by {@link matchVoidCause} /
   * {@link matchMismatch} — no side inversion, the writer stored it relative to
   * this match's `home` team.
   */
  ruling?: string | null;
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
  /**
   * A match-level director ruling token that is NOT a board score (never read
   * by `boardResult`). Currently the EBU §3.5 mismatch ruling
   * (`MM:<side>:<direction>:<fault>`); absent/null for an ordinary board.
   */
  matchRuling?: string | null;
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
  /** The match-level director ruling (home-relative), or null. */
  ruling: string | null;
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
 * Index a game's board rows by `(section, round, homeTable)` → its boards keyed
 * by board number, where homeTable is the NS seat's table (the room's home
 * team). Shared by the TEAMS and TRIPLE readers to gather each room's rows.
 */
function indexRoomsByHomeTable<R extends TeamMatchRow>(
  rows: R[],
): Map<string, Map<number, R>> {
  const byRoom = new Map<string, Map<number, R>>();
  for (const row of rows) {
    if (row.status === "SIT_OUT" || row.status === "HALF_AVERAGE") continue;
    let homeTable: number;
    try {
      homeTable = parseSeat(row.ns).tableNumber;
    } catch {
      continue;
    }
    const key = `${row.section}|${row.roundNumber}|${homeTable}`;
    const map = byRoom.get(key) ?? new Map<number, R>();
    map.set(row.boardNumber, row);
    byRoom.set(key, map);
  }
  return byRoom;
}

/**
 * Reconstruct the Swiss Teams two-team matches from the authoritative `matches`
 * rows (the TEAMS kind), gathering each encounter's two rooms' board rows.
 *
 * A match row names the two teams (`home`/`opponent` as home-NS seat ids) and
 * the round; the home room is the board rows at the home team's own table (NS =
 * home team), the opponent room the rows at the opponent's table. This replaces
 * the former board-seating reconstruction (and its triple-table exclusion
 * heuristic): triples are their own `TRIPLE` rows, so they never appear here.
 * Matches are returned ordered by round, then section, then home table.
 */
export function groupTeamMatches<R extends TeamMatchRow>(
  rows: R[],
  matchRows: TeamMatchStructureRow[],
): TeamMatch<R>[] {
  const byRoom = indexRoomsByHomeTable(rows);
  const roomFor = (section: string, round: number, seat: string): Map<number, R> => {
    let table: number;
    try {
      table = parseSeat(seat).tableNumber;
    } catch {
      return new Map<number, R>();
    }
    return byRoom.get(`${section}|${round}|${table}`) ?? new Map<number, R>();
  };

  const matches: TeamMatch<R>[] = [];
  for (const m of matchRows) {
    if (m.kind !== "TEAMS" || m.opponent == null) continue;
    let homeTable: number;
    let opponentTable: number;
    try {
      homeTable = parseSeat(m.home).tableNumber;
      opponentTable = parseSeat(m.opponent).tableNumber;
    } catch {
      continue;
    }
    matches.push({
      section: m.section,
      round: m.roundNumber,
      homeTable,
      opponentTable,
      homeTeamId: m.home,
      opponentTeamId: m.opponent,
      homeRowsByBoard: roomFor(m.section, m.roundNumber, m.home),
      opponentRowsByBoard: roomFor(m.section, m.roundNumber, m.opponent),
      ruling: m.ruling ?? null,
    });
  }

  return matches.sort((a, b) =>
    compareByRoundSectionTable(
      { round: a.round, section: a.section, table: a.homeTable },
      { round: b.round, section: b.section, table: b.homeTable },
    ),
  );
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
 * A board counts when BOTH rooms have a comparable scored result (a pass-out /
 * not-played / unentered board maps to a null score and is skipped), OR when it
 * is a REMOVED_TEAMS board (§3.3.7): a removed board contributes a fixed ±3 IMP
 * swing (from the home team's perspective, by the director's fault ruling) and
 * counts as played, so the VP scale uses the full board count. The per-board
 * list spans every board either room has a row for, in ascending board order,
 * so the USEBIO export can emit a traveller entry per board even when only one
 * room has played it yet.
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
    const homeRow = match.homeRowsByBoard.get(boardNumber);
    const awayRow = match.opponentRowsByBoard.get(boardNumber);

    // §3.3.7 removed board: a fixed ±3 IMP indemnity instead of a comparison.
    const removedSwing = removedBoardHomeSwing(homeRow, awayRow);
    if (removedSwing != null) {
      margin += removedSwing;
      boardsPlayed += 1;
      perBoard.push({ boardNumber, imps: removedSwing });
      continue;
    }

    const homeScore = scoreOfRow(homeRow);
    const awayScore = scoreOfRow(awayRow);

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

/**
 * The §3.3.6/§3.3.9 void cause of a match, from the HOME team's perspective, or
 * null when the match is not void. Read directly off the match row's `ruling`
 * (a `VOID:<cause>` token the writer stored home-relative to this match's `home`
 * team), so no side inversion is needed. SEATING_* causes are side-independent.
 */
export function matchVoidCause<R extends TeamMatchRow>(
  match: TeamMatch<R>,
): VoidCause | null {
  return match.ruling != null ? parseVoidMatch(match.ruling) : null;
}

/**
 * The §3.5 mismatch ruling for a match, home-relative (NS = home team, EW =
 * opponent), or null if the match is not a mismatch. Read directly off the
 * match row's `ruling` (an `MM:<side>:<direction>:<fault>` token stored
 * home-relative), so no side flip is needed.
 */
export function matchMismatch<R extends TeamMatchRow>(
  match: TeamMatch<R>,
): MismatchRuling | null {
  return match.ruling != null ? parseMismatch(match.ruling) : null;
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
    const homeRow = match.homeRowsByBoard.get(boardNumber);
    const awayRow = match.opponentRowsByBoard.get(boardNumber);

    // §3.3.7 removed board: a win/tie/loss indemnity by fault instead of a
    // comparison (the board-win analogue of the ±3 IMP swing).
    const removedResult = removedBoardHomeWin(homeRow, awayRow);
    if (removedResult != null) {
      won += removedResult;
      boardsPlayed += 1;
      perBoard.push({ boardNumber, result: removedResult });
      continue;
    }

    const homeScore = scoreOfRow(homeRow);
    const awayScore = scoreOfRow(awayRow);

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
 * Recover the team byes from the authoritative `matches` rows (the BYE kind).
 *
 * A BYE match names the sitting team (`home`) and the round; its board span
 * gives the board count the average-plus credit is sized on. The teams overall
 * scorers use this to credit the sitting team for the round it sat out.
 */
export function teamByeRounds(
  matchRows: TeamMatchStructureRow[],
): TeamByeRound[] {
  const byes: TeamByeRound[] = [];
  for (const m of matchRows) {
    if (m.kind !== "BYE") continue;
    byes.push({
      teamId: m.home,
      round: m.roundNumber,
      boards: m.boardEnd - m.boardStart + 1,
    });
  }
  return byes;
}

/** A table row's final score (override ?? confirmed), or null when unscored. */
function scoreOfRow<R extends TeamMatchRow>(row: R | undefined): number | null {
  if (!row) return null;
  const outcome = boardResult(row);
  return outcome != null ? outcomeToScore(row.boardNumber, outcome) : null;
}

/**
 * The removal fault token on a row, if it is a REMOVED_TEAMS board (§3.3.7),
 * else null. The fault is stored in `directorOverrideResult` as a `TRM:<fault>`
 * token; a row only counts as removed when its status says so.
 */
function removalFaultOfRow<R extends TeamMatchRow>(row: R | undefined) {
  if (!row || row.status !== "REMOVED_TEAMS") return null;
  return row.directorOverrideResult != null
    ? parseRemovedTeamsBoard(row.directorOverrideResult)
    : null;
}

/**
 * The §3.3.7 IMP swing a removed board contributes to the match margin, from
 * the HOME team's perspective, or null when neither room's row is a removed
 * board. The fault is read from the home row (whose NS seat is the home team);
 * if only the opponent row carries it, the swing is inverted (its NS seat is
 * the opponent team). A removed row missing its token defaults to a 0 swing
 * (both-indemnified) rather than dropping the board.
 */
function removedBoardHomeSwing<R extends TeamMatchRow>(
  homeRow: R | undefined,
  awayRow: R | undefined,
): number | null {
  const homeFault = removalFaultOfRow(homeRow);
  if (homeFault != null) return removedBoardNsSwing(homeFault);

  const awayFault = removalFaultOfRow(awayRow);
  if (awayFault != null) return -removedBoardNsSwing(awayFault);

  // A REMOVED_TEAMS row with no parseable token: treat as a 0 (neither-fault)
  // swing so the board still counts, rather than silently dropping it.
  if (homeRow?.status === "REMOVED_TEAMS" || awayRow?.status === "REMOVED_TEAMS") {
    return 0;
  }
  return null;
}

/**
 * The §3.3.7 Board-a-Match result a removed board awards the HOME team, or null
 * when neither room's row is a removed board. The board-win analogue of
 * {@link removedBoardHomeSwing}: the non-offending side WINS the board (1), the
 * offender loses (0), and both-/neither-at-fault is a tie (0.5) — a board-win
 * total cannot give both teams a win or both a loss, so the per-board result is
 * complementary (home + opponent = 1). The both-vs-neither distinction is only
 * expressible at the match level, via a VOID_MATCH ruling.
 */
function removedBoardHomeWin<R extends TeamMatchRow>(
  homeRow: R | undefined,
  awayRow: R | undefined,
): number | null {
  const homeFault = removalFaultOfRow(homeRow);
  const fault = homeFault ?? invertRemovalFaultForOpponent(awayRow);
  if (fault === "UNRESOLVED") {
    // A REMOVED_TEAMS row with no parseable token → a tie, so it still counts.
    return 0.5;
  }
  if (fault == null) return null;

  switch (fault) {
    case "EW_FAULT":
      return 1; // opponents at fault → home wins the board
    case "NS_FAULT":
      return 0; // home at fault → home loses the board
    case "BOTH_FAULT":
    case "NEITHER_FAULT":
      return 0.5; // tie (both-vs-neither is a match-level void concern)
  }
}

/**
 * The removal fault from the HOME team's perspective when only the OPPONENT
 * room carries it (its NS seat is the opponent team, so NS/EW fault flips).
 * Returns `"UNRESOLVED"` when the opponent row is a removed board but carries no
 * parseable token (so the caller can still count it), or null when it is not a
 * removed board.
 */
function invertRemovalFaultForOpponent<R extends TeamMatchRow>(
  awayRow: R | undefined,
) {
  const awayFault = removalFaultOfRow(awayRow);
  if (awayFault != null) {
    if (awayFault === "EW_FAULT") return "NS_FAULT" as const;
    if (awayFault === "NS_FAULT") return "EW_FAULT" as const;
    return awayFault; // BOTH/NEITHER are side-symmetric
  }
  if (awayRow?.status === "REMOVED_TEAMS") return "UNRESOLVED" as const;
  return null;
}

/* =========================================================================
   TRIPLES (three-way matches for an odd field)

   When the field is odd, three teams x < y < z play a three-way instead of one
   team sitting out. A triple is a round-robin of three HEAD-TO-HEAD comparisons
   — x-y, y-z, z-x — each an ordinary two-room, same-boards team match on its
   own board set (A, B, C). It comes in two kinds:

     - SHORT: the whole three-way is one round. A/B are the round's two halves,
       C a fresh half-set; all six rooms (two per comparison) are in that round.
     - LONG: the three-way is spread over two consecutive rounds R and R+1 on
       FULL board sets (A = round R's boards, B = round R+1's, C a fresh full
       set). The half-1 room of each comparison is played in round R, the half-2
       room in round R+1 — but BOTH rooms of a comparison sit on the SAME set,
       so each comparison IMPs cleanly on its one set.

   This is NOT the old cross-IMP-across-three-tables model: each comparison is a
   normal two-team head-to-head, scored with `teamMatchBoardImps` /
   `teamMatchBoardWins`. The scorers convert each comparison's margin to VP on
   the 10-VP half pool (SHORT) or 20-VP full pool (LONG) and sum a team's two.

   Detection from board rows (no stored metadata): within a (section, round),
     - a home table that references TWO distinct opponents is a SHORT triple
       member (an ordinary match references exactly one opponent); its trio is
       that table and its two opponents;
     - otherwise, three single-opponent tables whose references form a
       NON-MUTUAL directed 3-cycle (x→y→z→x) are a LONG triple's round. The two
       consecutive rounds of a long triple each show such a 3-cycle for the same
       trio and are merged into one triple spanning both rounds.
   ========================================================================= */

/** Which kind of three-way a reconstructed triple is. */
export type TeamTripleKind = "SHORT" | "LONG";

/** One table of a triple (its home team), kept for the traveller/board view. */
interface TripleTable {
  table: number;
  teamId: string;
}

/**
 * One reconstructed three-way triple as its three head-to-head comparisons.
 *
 * Each comparison is an ordinary two-team {@link TeamMatch} (two rooms on one
 * board set), so the standard two-team scorers apply. `kind` says whether the
 * three-way was SHORT (one round, 10-VP half pool) or LONG (two rounds, 20-VP
 * full pool); `rounds` lists the round(s) it spans (one for SHORT, two for
 * LONG). `round` is the first round (for ordering). `tables` carries the three
 * home teams in ascending table order for the board/traveller view.
 */
export interface TeamTriple<R extends TeamMatchRow> {
  section: string;
  round: number;
  kind: TeamTripleKind;
  rounds: number[];
  tables: [TripleTable, TripleTable, TripleTable];
  /** The three head-to-head comparisons, in ascending (lo, hi) team order. */
  comparisons: [TeamMatch<R>, TeamMatch<R>, TeamMatch<R>];
}

/**
 * The round a comparison is ordered/credited by: the smallest round number any
 * of its rooms' rows carry, falling back to the triple's first round when the
 * comparison has no rows yet.
 */
function comparisonMinRound<R extends TeamMatchRow>(
  home: Map<number, R>,
  opponent: Map<number, R>,
  tripleRounds: number[],
): number {
  let min = Number.POSITIVE_INFINITY;
  for (const map of [home, opponent]) {
    for (const row of map.values()) {
      if (row.roundNumber < min) min = row.roundNumber;
    }
  }
  return Number.isFinite(min) ? min : Math.min(...tripleRounds);
}

/**
 * Reconstruct the three-way triples from the authoritative `matches` rows (the
 * TRIPLE kind), as their three head-to-head comparisons.
 *
 * A triple is one `groupId`; its three TRIPLE match rows are its x-y, y-z, z-x
 * comparisons (each `home`/`opponent` naming two of the trio's teams, with its
 * own board span). Each comparison's two rooms are the board rows at the two
 * teams' tables restricted to that comparison's board span — so a home table
 * hosting two opponents on two sets contributes the right rooms to each. `kind`
 * is read from the comparison pool (10 = SHORT half, 20 = LONG full). Triples
 * are returned ordered by first round, then section, then lowest table.
 */
export function groupTeamTriples<R extends TeamMatchRow>(
  rows: R[],
  matchRows: TeamMatchStructureRow[],
): TeamTriple<R>[] {
  // Group the TRIPLE match rows by their triple's groupId.
  const byGroup = new Map<string, TeamMatchStructureRow[]>();
  for (const m of matchRows) {
    if (m.kind !== "TRIPLE" || m.groupId == null) continue;
    const list = byGroup.get(m.groupId) ?? [];
    list.push(m);
    byGroup.set(m.groupId, list);
  }
  if (byGroup.size === 0) return [];

  const byRoom = indexRoomsByHomeTable(rows);
  /** The board rows at `seat`'s table within `[start,end]`, keyed by board. */
  const roomBoards = (
    section: string,
    seat: string,
    start: number,
    end: number,
  ): Map<number, R> => {
    let table: number;
    try {
      table = parseSeat(seat).tableNumber;
    } catch {
      return new Map<number, R>();
    }
    const out = new Map<number, R>();
    // A triple home table hosts two opponents across two rounds (LONG) / two
    // sets (SHORT); gather this comparison's own board span from whichever
    // round-keyed rooms hold those boards.
    for (const [key, map] of byRoom) {
      const [sec, , tbl] = key.split("|");
      if (sec !== section || Number(tbl) !== table) continue;
      for (const [board, row] of map) {
        if (board >= start && board <= end) out.set(board, row);
      }
    }
    return out;
  };

  const triples: TeamTriple<R>[] = [];
  for (const comparisonRows of byGroup.values()) {
    const section = comparisonRows[0].section;
    const kind: TeamTripleKind =
      comparisonRows[0].vpPool === 20 ? "LONG" : "SHORT";

    const teamTables = new Set<number>();
    const rounds = new Set<number>();
    const comparisons = comparisonRows.map((c) => {
      const lo = parseSeat(c.home).tableNumber;
      const hi = parseSeat(c.opponent!).tableNumber;
      teamTables.add(lo);
      teamTables.add(hi);
      const homeRowsByBoard = roomBoards(section, c.home, c.boardStart, c.boardEnd);
      const opponentRowsByBoard = roomBoards(
        section,
        c.opponent!,
        c.boardStart,
        c.boardEnd,
      );
      // The round(s) a triple spans come from the actual board rows (a LONG
      // triple's two rooms sit in different rounds), not the match row's single
      // first-slot round.
      for (const map of [homeRowsByBoard, opponentRowsByBoard]) {
        for (const bRow of map.values()) rounds.add(bRow.roundNumber);
      }
      if (rounds.size === 0) rounds.add(c.roundNumber);
      const round = comparisonMinRound(
        homeRowsByBoard,
        opponentRowsByBoard,
        [c.roundNumber],
      );
      return {
        section,
        round,
        homeTable: lo,
        opponentTable: hi,
        homeTeamId: c.home,
        opponentTeamId: c.opponent!,
        homeRowsByBoard,
        opponentRowsByBoard,
        ruling: c.ruling ?? null,
      } satisfies TeamMatch<R>;
    }) as [TeamMatch<R>, TeamMatch<R>, TeamMatch<R>];

    const sortedTables = [...teamTables].sort((a, b) => a - b);
    const sortedRounds = [...rounds].sort((a, b) => a - b);
    triples.push({
      section,
      round: Math.min(...sortedRounds),
      kind,
      rounds: sortedRounds,
      tables: sortedTables.map((table) => ({
        table,
        teamId: teamIdFor(section, table),
      })) as [TripleTable, TripleTable, TripleTable],
      comparisons,
    });
  }

  return triples.sort((a, b) =>
    compareByRoundSectionTable(
      { round: a.round, section: a.section, table: a.tables[0].table },
      { round: b.round, section: b.section, table: b.tables[0].table },
    ),
  );
}

/**
 * One team's stake in one of a triple's three head-to-head comparisons.
 *
 * A triple's three teams each play TWO of the three comparisons. This flattens
 * a triple into those six (team, comparison) stakes so a scorer can credit each
 * team its two comparison results. `isHome` says whether the team is the
 * comparison's home (NS/primary) side — the side a positive IMP margin favours —
 * so the scorer can apply the margin's sign. `round` is the round the result is
 * credited to: the round the team's own NS (home) pair hosted this comparison
 * in (its home room's round). For a SHORT triple both of a team's comparisons
 * credit the single round; for a LONG triple they split across R and R+1 by
 * which round the team's NS pair hosted each opponent (design §5).
 */
export interface TripleTeamStake<R extends TeamMatchRow> {
  teamId: string;
  round: number;
  isHome: boolean;
  comparison: TeamMatch<R>;
}

/** The round a side's NS (home) pair hosted a comparison in. */
function nsHostRound<R extends TeamMatchRow>(
  rowsByBoard: Map<number, R>,
  fallback: number,
): number {
  let min = Number.POSITIVE_INFINITY;
  for (const row of rowsByBoard.values()) {
    if (row.roundNumber < min) min = row.roundNumber;
  }
  return Number.isFinite(min) ? min : fallback;
}

/**
 * Flatten a triple into its six (team, comparison) stakes — two per team — each
 * tagged with the round that team's NS pair hosted the comparison in. The
 * scorer scores each comparison with {@link teamMatchBoardImps} /
 * {@link teamMatchBoardWins} and credits the team (respecting `isHome` for the
 * margin sign) on its stake `round`.
 */
export function tripleTeamStakes<R extends TeamMatchRow>(
  triple: TeamTriple<R>,
): TripleTeamStake<R>[] {
  const stakes: TripleTeamStake<R>[] = [];
  for (const comparison of triple.comparisons) {
    // The home side's NS pair hosts in its home room; the opponent side's NS
    // pair hosts in the opponent room. Each credits that room's round.
    stakes.push({
      teamId: comparison.homeTeamId,
      round: nsHostRound(comparison.homeRowsByBoard, triple.round),
      isHome: true,
      comparison,
    });
    stakes.push({
      teamId: comparison.opponentTeamId,
      round: nsHostRound(comparison.opponentRowsByBoard, triple.round),
      isHome: false,
      comparison,
    });
  }
  return stakes;
}

/** The IMP-to-VP pool a triple's comparisons use: 10 for SHORT, 20 for LONG. */
export function tripleVpPool(triple: TeamTriple<TeamMatchRow>): 10 | 20 {
  return triple.kind === "LONG" ? 20 : 10;
}
