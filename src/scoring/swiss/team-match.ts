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

  // Triple tables score cross-IMP across three tables (see groupTeamTriples),
  // not as two-table head-to-heads, so exclude them here to avoid mis-pairing.
  const tripleTables = tripleTableKeys(rows);

  // Index each home table's rows by (section, round, homeTable).
  const homeTables = new Map<string, HomeEntry>();
  for (const row of rows) {
    if (row.status === "SIT_OUT") continue;

    const nsSeat = parseSeat(row.ns);
    const ewSeat = parseSeat(row.ew);
    const homeTable = nsSeat.tableNumber;
    const opponentTable = ewSeat.tableNumber;

    if (tripleTables.has(`${row.section}|${row.roundNumber}|${homeTable}`)) {
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
 * null when the match is not void. A match is void when any of its rows carries
 * the `VOID_MATCH` status; the cause is read from a home row (whose NS seat is
 * the home team). If only an opponent row carries it, the offender side is
 * inverted (its NS seat is the opponent team) so the returned cause is always
 * home-relative. SEATING_* causes are side-independent and returned as-is.
 */
export function matchVoidCause<R extends TeamMatchRow>(
  match: TeamMatch<R>,
): VoidCause | null {
  const homeCause = voidCauseOfRows(match.homeRowsByBoard);
  if (homeCause != null) return homeCause;

  const oppCause = voidCauseOfRows(match.opponentRowsByBoard);
  if (oppCause != null) return invertVoidCause(oppCause);

  return null;
}

/** The void cause carried by any VOID_MATCH row in the map, else null. */
function voidCauseOfRows<R extends TeamMatchRow>(
  rowsByBoard: Map<number, R>,
): VoidCause | null {
  for (const row of rowsByBoard.values()) {
    if (row.status !== "VOID_MATCH") continue;
    const cause =
      row.directorOverrideResult != null
        ? parseVoidMatch(row.directorOverrideResult)
        : null;
    if (cause != null) return cause;
  }
  return null;
}

/** Flip the offender side of a SHORT_* cause (NS↔EW); others unchanged. */
function invertVoidCause(cause: VoidCause): VoidCause {
  if (cause === "SHORT_OFFENDER_NS") return "SHORT_OFFENDER_EW";
  if (cause === "SHORT_OFFENDER_EW") return "SHORT_OFFENDER_NS";
  return cause;
}

/**
 * The §3.5 mismatch ruling for a match, home-relative (NS = home team, EW =
 * opponent), or null if the match is not a mismatch. A MISMATCH token names the
 * mismatched side relative to the room it was stamped on; if only the opponent
 * room carries it, the side is flipped (NS↔EW) so the returned ruling is always
 * home-relative — the same convention `matchVoidCause` uses.
 */
export function matchMismatch<R extends TeamMatchRow>(
  match: TeamMatch<R>,
): MismatchRuling | null {
  const home = mismatchOfRows(match.homeRowsByBoard);
  if (home != null) return home;

  const opp = mismatchOfRows(match.opponentRowsByBoard);
  if (opp != null) {
    return { ...opp, side: opp.side === "NS" ? "EW" : "NS" };
  }

  return null;
}

/** The mismatch ruling carried by any MISMATCH row in the map, else null. */
function mismatchOfRows<R extends TeamMatchRow>(
  rowsByBoard: Map<number, R>,
): MismatchRuling | null {
  for (const row of rowsByBoard.values()) {
    if (row.status !== "MISMATCH") continue;
    const ruling =
      row.matchRuling != null ? parseMismatch(row.matchRuling) : null;
    if (ruling != null) return ruling;
  }
  return null;
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
 * A detected triple: its three teams (ascending home-table order), its kind,
 * and the round(s) it spans (one for SHORT, two consecutive for LONG). This is
 * the shape {@link detectTriples} returns before the comparison rows are
 * gathered; the draw-history reader also consumes it to recover `hadTriple`
 * and a long triple's first-slot teams.
 */
export interface DetectedTriple {
  section: string;
  teams: [number, number, number];
  kind: TeamTripleKind;
  rounds: number[];
}

/** Build the per-(section,round) map of home table → set of opponent tables. */
function opponentsByRound<R extends TeamMatchRow>(
  rows: R[],
): Map<string, Map<number, Set<number>>> {
  const perRound = new Map<string, Map<number, Set<number>>>();
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
    const key = `${row.section}|${row.roundNumber}`;
    const byHome = perRound.get(key) ?? new Map<number, Set<number>>();
    const opps = byHome.get(homeTable) ?? new Set<number>();
    opps.add(opponentTable);
    byHome.set(homeTable, opps);
    perRound.set(key, byHome);
  }
  return perRound;
}

/**
 * Detect every triple from the board rows: SHORT triples (one round, some table
 * with two opponents) and LONG triples (two consecutive rounds, each a
 * non-mutual 3-cycle for the same trio). Exported so the draw-history reader
 * can recover `hadTriple` and a long triple's first-slot teams with the SAME
 * detection the scorer uses (no divergent logic). Only the `section`,
 * `roundNumber`, `ns`, `ew` and `status` fields of each row are read.
 */
export function detectTriples<R extends TeamMatchRow>(
  rows: R[],
): DetectedTriple[] {
  const perRound = opponentsByRound(rows);

  const shorts: DetectedTriple[] = [];
  // LONG rounds collected per (section, trio) so the two consecutive rounds of
  // one long triple can be paired up.
  const longRounds = new Map<
    string,
    { section: string; teams: [number, number, number]; rounds: number[] }
  >();

  for (const [key, byHome] of perRound) {
    const [section, roundStr] = key.split("|");
    const round = Number(roundStr);

    // SHORT: a table with >=2 distinct opponents. Its trio is that table plus
    // its two opponents (each of which also has two opponents in the trio).
    const shortSeen = new Set<number>();
    let hadShort = false;
    for (const [home, opps] of byHome) {
      if (opps.size < 2 || shortSeen.has(home)) continue;
      const members = [home, ...opps].sort((a, b) => a - b);
      if (members.length !== 3) continue; // a well-formed triple has three
      hadShort = true;
      for (const m of members) shortSeen.add(m);
      shorts.push({
        section,
        teams: [members[0], members[1], members[2]],
        kind: "SHORT",
        rounds: [round],
      });
    }
    if (hadShort) continue;

    // LONG round: a non-mutual directed 3-cycle x→y→z→x among single-opponent
    // tables. Each triple table references exactly one opponent this round.
    const single = new Map<number, number>();
    for (const [home, opps] of byHome) {
      if (opps.size === 1) single.set(home, [...opps][0]!);
    }
    const seen = new Set<number>();
    for (const [x, y] of single) {
      if (seen.has(x)) continue;
      if (single.get(y) === x) continue; // mutual = ordinary two-team match
      const z = single.get(y);
      if (z === undefined) continue;
      if (single.get(z) === x && new Set([x, y, z]).size === 3) {
        for (const m of [x, y, z]) seen.add(m);
        const teams = [x, y, z].sort((a, b) => a - b) as [
          number,
          number,
          number,
        ];
        const trioKey = `${section}|${teams.join("-")}`;
        const entry = longRounds.get(trioKey) ?? { section, teams, rounds: [] };
        entry.rounds.push(round);
        longRounds.set(trioKey, entry);
      }
    }
  }

  // Group each trio's long rounds into long triples. A fully-played long triple
  // spans two consecutive rounds, paired here; a long triple whose SECOND slot
  // isn't materialized yet shows just its first round (an unpaired long round) —
  // still emitted as a LONG triple so (a) the scorer sits it at the neutral
  // 10/10 until the second slot is scored (its comparisons have only one room so
  // nothing is comparable), and (b) the draw can recover its three teams to
  // reuse for the second slot.
  const longs: DetectedTriple[] = [];
  for (const { section, teams, rounds } of longRounds.values()) {
    const sorted = [...rounds].sort((a, b) => a - b);
    for (let i = 0; i < sorted.length; i += 2) {
      const pair =
        i + 1 < sorted.length ? [sorted[i], sorted[i + 1]] : [sorted[i]];
      longs.push({ section, teams, kind: "LONG", rounds: pair });
    }
  }

  return [...shorts, ...longs];
}

/**
 * The set of `(section|round|table)` keys that belong to a triple, so
 * {@link groupTeamMatches} can exclude them from the two-team reconstruction.
 */
function tripleTableKeys<R extends TeamMatchRow>(rows: R[]): Set<string> {
  const keys = new Set<string>();
  for (const t of detectTriples(rows)) {
    for (const round of t.rounds) {
      for (const table of t.teams) {
        keys.add(`${t.section}|${round}|${table}`);
      }
    }
  }
  return keys;
}

/**
 * Keep only the rows of one home table that face a given opponent table. A
 * triple's home table hosts TWO opponents (on two board sets), so a comparison
 * must take only the rooms against its opponent. Returns rows keyed by board.
 */
function restrictRowsToOpponent<R extends TeamMatchRow>(
  rowsByBoard: Map<number, R>,
  opponentTable: number,
): Map<number, R> {
  const out = new Map<number, R>();
  for (const [board, row] of rowsByBoard) {
    try {
      if (parseSeat(row.ew).tableNumber === opponentTable) {
        out.set(board, row);
      }
    } catch {
      // Non-seat EW (should not occur for a triple row) is skipped.
    }
  }
  return out;
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
 * Reconstruct the three-way triples from a game's board rows as their three
 * head-to-head comparisons.
 *
 * Each detected triple's rows (restricted to its rounds and three teams) are
 * grouped by unordered team pair into three {@link TeamMatch} comparisons
 * (x-y, x-z, y-z), each an ordinary two-room same-boards match the standard
 * two-team scorers consume. Triples are returned ordered by first round, then
 * section, then lowest table — matching {@link groupTeamMatches}.
 */
export function groupTeamTriples<R extends TeamMatchRow>(
  rows: R[],
): TeamTriple<R>[] {
  const detected = detectTriples(rows);
  if (detected.length === 0) return [];

  const triples: TeamTriple<R>[] = [];

  for (const det of detected) {
    const { section, teams, rounds } = det;
    const roundSet = new Set(rounds);
    const teamSet = new Set<number>(teams);

    // rowsByBoard for each of the three home tables (this triple only).
    const rowsByTable = new Map<number, Map<number, R>>();
    for (const t of teams) rowsByTable.set(t, new Map<number, R>());

    for (const row of rows) {
      if (row.status === "SIT_OUT") continue;
      if (row.section !== section || !roundSet.has(row.roundNumber)) continue;
      let homeTable: number;
      let opponentTable: number;
      try {
        homeTable = parseSeat(row.ns).tableNumber;
        opponentTable = parseSeat(row.ew).tableNumber;
      } catch {
        continue;
      }
      // Only rows between two of this triple's teams belong to it.
      if (!teamSet.has(homeTable) || !teamSet.has(opponentTable)) continue;
      rowsByTable.get(homeTable)!.set(row.boardNumber, row);
    }

    // The three unordered pairs become three head-to-head comparisons. For a
    // pair (lo, hi) the home room is lo-NS and the opponent room is hi-NS; both
    // rooms share the comparison's board set, so teamMatchBoardImps lines them
    // up by board number.
    const pairs: Array<[number, number]> = [
      [teams[0], teams[1]],
      [teams[0], teams[2]],
      [teams[1], teams[2]],
    ];

    const comparisons = pairs.map(([lo, hi]) => {
      const homeRowsByBoard = restrictRowsToOpponent(rowsByTable.get(lo)!, hi);
      const opponentRowsByBoard = restrictRowsToOpponent(
        rowsByTable.get(hi)!,
        lo,
      );
      const round = comparisonMinRound(
        homeRowsByBoard,
        opponentRowsByBoard,
        rounds,
      );
      return {
        section,
        round,
        homeTable: lo,
        opponentTable: hi,
        homeTeamId: teamIdFor(section, lo),
        opponentTeamId: teamIdFor(section, hi),
        homeRowsByBoard,
        opponentRowsByBoard,
      } satisfies TeamMatch<R>;
    }) as [TeamMatch<R>, TeamMatch<R>, TeamMatch<R>];

    triples.push({
      section,
      round: Math.min(...rounds),
      kind: det.kind,
      rounds: [...rounds].sort((a, b) => a - b),
      tables: teams.map((table) => ({
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
