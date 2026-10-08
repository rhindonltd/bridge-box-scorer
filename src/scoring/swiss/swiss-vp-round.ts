import { outcomeToScore, computeCrossImps } from "@/scoring/traveller/common";
import { scoreMP } from "@/scoring/traveller/pair/mp";
import { impVpSided } from "./imp-vp-table";
import { mpVpFromPercent } from "./mp-vp-table";
import { NEUTRAL_VP, SwissVpBoardRow } from "./swiss-vp-overall";
import { boardResult } from "./team-match";
import {
  COMPENSATION_SEGMENT,
  PairSegment,
  PairVoidFault,
  compensationMpFractions,
  compensationXimpPerComparison,
  isHalfMatchRound,
  segmentsForPair,
  voidMpFractions,
  voidXimpPerComparison,
} from "./swiss-half-match";
import { parsePairVoid, pairVoidFaults } from "@/model/pairs-match-void";
import { ScoredMpBoard } from "@/scoring/traveller/pair/neuberg-across-boards";
import { applyBetterThanAverage } from "@/scoring/traveller/pair/better-than-average";
import { roundMpBoards } from "@/scoring/traveller/pair/round-mp-boards";
import { parseMismatch, adjustMismatchVp } from "@/model/swiss-mismatch";

/**
 * The minimal `matches`-row shape the Swiss Pairs VP scorer needs for the
 * match-level rulings (§3.3.8 void-pair, §3.5 mismatch). A PAIRS match is one
 * table; its `ruling` (home-relative) drives the void/mismatch adjustment. Kept
 * structural so the scorer stays a pure module.
 */
export interface SwissVpMatchRow {
  id: number;
  roundNumber: number;
  kind: string;
  home: string;
  opponent: string | null;
  ruling: string | null;
}

/**
 * Clamp a matchpoint percentage into the [0, 100] range the VP tables accept.
 *
 * A pair's `mp / max` can legitimately brush just past 100% (or dip below 0%)
 * on a mixed artificial+real board: Neuberg convention (b) over-projects a real
 * pair's matchpoints to compensate for the artificial lines, so the summed `mp`
 * can exceed the summed `max` by a fraction. That is a benign scaling artifact,
 * not a programmer error, so we clamp here rather than let `mpVpFromPercent`
 * throw its out-of-range invariant guard. The guard stays meaningful for
 * genuinely wild inputs elsewhere.
 */
function clampPercent(pct: number): number {
  if (pct < 0) return 0;
  if (pct > 100) return 100;
  return pct;
}

/**
 * Shared per-ROUND Swiss Pairs Victory-Point scoring, used by BOTH the live
 * leaderboard overall scorers (`swiss-ximp-vp-overall.ts`,
 * `swiss-mp-vp-overall.ts`) and the USEBIO export (`assemble-swiss-pairs.ts`).
 *
 * Keeping this one module as the single source of truth means the exported file
 * cannot drift from the on-screen standings: both consume the same per-pair
 * round VP, computed on the same discrete (integer) scale.
 *
 * Two things come out of a round:
 *  - `pairVp`: each real pair's VP for the round (its full-round /20 for an
 *    ordinary round; the sum of its two halves for a half-match round,
 *    INCLUDING the compensated half a non-anchor missed). This is exactly what
 *    the overall scorer credits and what the export's `TOTAL_SCORE` sums.
 *  - `matches`: one entry per REAL head-to-head half — an ordinary table's full
 *    round, or one of a half-match group's two real halves — with the NS/EW VP
 *    split the export emits as a `MATCH`. A compensated (sat-out) half has no
 *    opponent and is NOT a match; it only contributes to the pair's `pairVp`.
 *
 * Rounds are scored INDEPENDENTLY against the whole section field restricted to
 * each half's board subset (not head-to-head at one table) — matchpoint or
 * cross-IMP depending on the mode — exactly as the leaderboard does.
 */

/** One real head-to-head half, with the VP split the export emits as a MATCH. */
export interface SwissVpMatch {
  /** The NS pair id (section-qualified seat, e.g. "A1NS"). */
  nsId: string;
  /** The EW pair id. */
  ewId: string;
  /** NS pair's VP for this half (10-VP scale for a half, 20 for a full round). */
  nsVp: number;
  /** EW pair's VP for this half. */
  ewVp: number;
  /** The board numbers this half covers, ascending. */
  boardNumbers: number[];
}

/** The scored result of one round: per-pair round VP plus the real-half MATCHes. */
export interface SwissVpRound {
  /** Each real pair's VP for the round (incl. any compensated half). */
  pairVp: Map<string, number>;
  /** One entry per real head-to-head half (ordinary table or group half). */
  matches: SwissVpMatch[];
}

/** Round a signed value to a whole number, breaking an exact half AWAY from zero. */
function roundHalfAwayFromZero(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value));
}

/** All of a round's rows (across boards) that a pair appears in. */
function rowsForPair(
  byBoard: Map<number, SwissVpBoardRow[]>,
  pairId: string,
): SwissVpBoardRow[] {
  const rows: SwissVpBoardRow[] = [];
  for (const boardRows of byBoard.values()) {
    for (const row of boardRows) {
      if (row.ns === pairId || row.ew === pairId) rows.push(row);
    }
  }
  return rows;
}

/**
 * Group a round's field rows by board number. SIT_OUT rows (byes) and VOID_PAIR
 * rows (a §3.3.8/§3.3.9 voided pairs match) are excluded: a voided match's
 * results must NOT sit in the field the other pairs are matchpointed against —
 * each voided pair is instead credited an AVE+/AVE−/AVE compensation separately
 * (see {@link scoreSwissVpRound}).
 */
function byBoardOf(
  rows: SwissVpBoardRow[],
  voidedMatchIds: Set<number>,
): Map<number, SwissVpBoardRow[]> {
  const byBoard = new Map<number, SwissVpBoardRow[]>();
  for (const row of rows) {
    if (row.status === "SIT_OUT") continue;
    // A voided pairs match's results must NOT sit in the field (its pairs get a
    // separate AVE+/AVE−/AVE compensation); identify it by its match ruling.
    if (row.matchId != null && voidedMatchIds.has(row.matchId)) continue;
    const arr = byBoard.get(row.boardNumber) ?? [];
    arr.push(row);
    byBoard.set(row.boardNumber, arr);
  }
  return byBoard;
}

/**
 * The set of real pairs that appear this round. A HALF_AVERAGE row's EW is the
 * phantom opponent, never a real pair — only its NS (the compensated non-anchor)
 * counts; it is already seen via its real played half.
 */
function seenPairs(byBoard: Map<number, SwissVpBoardRow[]>): Set<string> {
  const seen = new Set<string>();
  for (const rows of byBoard.values()) {
    for (const row of rows) {
      seen.add(row.ns);
      if (row.status !== "HALF_AVERAGE") seen.add(row.ew);
    }
  }
  return seen;
}

/* ============================================================
   CROSS-IMP (Butler) MODE
============================================================ */

/** Per-board field metadata for a round: comparison count and normaliser. */
interface XimpField {
  comparisons: number;
  normaliser: number;
}

/**
 * Build the per-(pair, board) normalised cross-IMP (XIMPQ) and per-board field
 * metadata for a round. Each table contributes one NS-perspective score; the
 * field is every table with a scored result on that board. The NS pair gains
 * the board's XIMPQ, the EW pair loses it (equal and opposite). A board with
 * fewer than two results has no comparison and is skipped.
 */
function buildXimpByBoard(byBoard: Map<number, SwissVpBoardRow[]>): {
  perPairBoard: Map<string, Map<number, number>>;
  fieldByBoard: Map<number, XimpField>;
} {
  const perPairBoard = new Map<string, Map<number, number>>();
  const fieldByBoard = new Map<number, XimpField>();

  const ensure = (pairId: string): Map<number, number> => {
    const m = perPairBoard.get(pairId) ?? new Map<number, number>();
    perPairBoard.set(pairId, m);
    return m;
  };

  for (const [boardNumber, rows] of byBoard) {
    const scored = rows
      .map((row) => ({ row, score: tableScore(row) }))
      .filter(
        (x): x is { row: SwissVpBoardRow; score: number } => x.score != null,
      );

    const field = scored.map((x) => x.score);
    const r = field.length;
    const c = r - 1;
    if (c <= 0) continue;

    const normaliser = Math.sqrt((r * c) / 2);
    fieldByBoard.set(boardNumber, { comparisons: c, normaliser });

    for (const { row, score } of scored) {
      const ximpq = computeCrossImps(score, field) / normaliser;
      ensure(row.ns).set(boardNumber, ximpq);
      ensure(row.ew).set(boardNumber, -ximpq);
    }
  }

  return { perPairBoard, fieldByBoard };
}

/** A table row's NS-perspective raw score, or null when not yet scored. */
function tableScore(row: SwissVpBoardRow): number | null {
  const outcome = boardResult(row);
  if (outcome == null) return null;
  return outcomeToScore(row.boardNumber, outcome);
}

/** A real (played) half's VP/10 for one pair, from its XIMPQ over the boards. */
function ximpRealHalfVp(
  rows: SwissVpBoardRow[],
  boardXimp: Map<number, number>,
): number {
  let ximpq = 0;
  let boardsPlayed = 0;
  for (const row of rows) {
    const q = boardXimp.get(row.boardNumber);
    if (q === undefined) continue;
    ximpq += q;
    boardsPlayed += 1;
  }
  if (boardsPlayed === 0) return NEUTRAL_VP / 2;
  // The half's cross-IMP total → VP on the EBU 10-VP discrete scale, keyed to
  // the half's played board count.
  return impVpSided(roundHalfAwayFromZero(ximpq), boardsPlayed, 10);
}

/** A compensated (unplayed) half's VP/10 for one pair (AVE+/AVE credit). */
function ximpCompensationHalfVp(
  rows: SwissVpBoardRow[],
  fieldByBoard: Map<number, XimpField>,
): number {
  const perComparison = compensationXimpPerComparison(rows.length);
  let ximpq = 0;
  let boardsPlayed = 0;
  rows.forEach((row, index) => {
    const field = fieldByBoard.get(row.boardNumber);
    if (!field) return;
    const rawImps = perComparison[index] * field.comparisons;
    ximpq += rawImps / field.normaliser;
    boardsPlayed += 1;
  });
  if (boardsPlayed === 0) return NEUTRAL_VP / 2;
  return impVpSided(roundHalfAwayFromZero(ximpq), boardsPlayed, 10);
}

/** An ordinary (full-round) VP for one pair, on the EBU 20-VP discrete scale. */
function ximpOrdinaryVp(boardXimp: Map<number, number>): number {
  const boardsPlayed = boardXimp.size;
  if (boardsPlayed === 0) return NEUTRAL_VP;
  let ximpq = 0;
  for (const q of boardXimp.values()) ximpq += q;
  return impVpSided(roundHalfAwayFromZero(ximpq), boardsPlayed, 20);
}

/** Score one round in cross-IMP mode: per-pair VP + real-half MATCH splits. */
function ximpRound(byBoard: Map<number, SwissVpBoardRow[]>): SwissVpRound {
  const { perPairBoard, fieldByBoard } = buildXimpByBoard(byBoard);
  const pairVp = new Map<string, number>();

  for (const pairId of seenPairs(byBoard)) {
    const segments = segmentsForPair(pairId, rowsForPair(byBoard, pairId));
    const boardXimp = perPairBoard.get(pairId) ?? new Map<number, number>();

    const vp = isHalfMatchRound(segments)
      ? segments.reduce(
          (sum, seg) =>
            sum +
            (seg.compensation
              ? ximpCompensationHalfVp(seg.rows, fieldByBoard)
              : ximpRealHalfVp(seg.rows, boardXimp)),
          0,
        )
      : ximpOrdinaryVp(boardXimp);

    pairVp.set(pairId, vp);
  }

  const matches = buildMatches(byBoard, (rows, nsId, ewId, isHalf) => {
    const nsVp = isHalf
      ? ximpRealHalfVp(rows, perPairBoard.get(nsId) ?? new Map())
      : ximpOrdinaryVp(perPairBoard.get(nsId) ?? new Map());
    const ewVp = isHalf
      ? ximpRealHalfVp(rows, perPairBoard.get(ewId) ?? new Map())
      : ximpOrdinaryVp(perPairBoard.get(ewId) ?? new Map());
    return { nsVp, ewVp };
  });

  return { pairVp, matches };
}

/* ============================================================
   MATCHPOINT MODE
============================================================ */

/** One board's matchpoint result for a pair: earned vs the field top. */
interface BoardMp {
  mp: number;
  max: number;
}

/** Build per-(pair, board) matchpoints and the per-board field top for a round. */
function buildMpByBoard(byBoard: Map<number, SwissVpBoardRow[]>): {
  perPairBoard: Map<string, Map<number, BoardMp>>;
  topByBoard: Map<number, number>;
} {
  const perPairBoard = new Map<string, Map<number, BoardMp>>();
  const topByBoard = new Map<number, number>();

  const ensure = (pairId: string): Map<number, BoardMp> => {
    const m = perPairBoard.get(pairId) ?? new Map<number, BoardMp>();
    perPairBoard.set(pairId, m);
    return m;
  };

  // Score every board of the round, then apply the §4.1.1.1 "better than
  // average" override across the WHOLE round (the Swiss window = the match):
  // an AVE+/AVE− board gives the pair the greater-of-60%/lesser-of-40% vs its
  // average on its other boards THIS round, in the standings. The per-board
  // traveller display (a separate path) keeps the flat 60/40.
  const scoredBoards: ScoredMpBoard[] = [];
  for (const [boardNumber, rows] of byBoard) {
    const lines = scoreMP(
      boardNumber,
      rows
        .filter((r) => boardResult(r) != null)
        .map((r) => ({ nsId: r.ns, ewId: r.ew, outcome: boardResult(r)! })),
    );
    scoredBoards.push({ board: boardNumber, lines });
  }

  // §4.2.6.1: round each board to the nearest whole matchpoint (halves away
  // from average) LAST, after the better-than-average uplift, so the per-round
  // percentage is built from the same rounded board scores the MP leaderboard
  // and USEBIO export use.
  for (const { board: boardNumber, lines } of roundMpBoards(
    applyBetterThanAverage(scoredBoards),
  )) {
    for (const line of lines) {
      if (line.maxMatchPoints > 0) topByBoard.set(boardNumber, line.maxMatchPoints);
      ensure(line.nsId).set(boardNumber, {
        mp: line.nsMatchPoints,
        max: line.maxMatchPoints,
      });
      ensure(line.ewId).set(boardNumber, {
        mp: line.ewMatchPoints,
        max: line.maxMatchPoints,
      });
    }
  }

  return { perPairBoard, topByBoard };
}

/**
 * A real (played) half's VP/10 for one pair, from its matchpoint percentage
 * over the half's boards, via the 10-VP EBU table (keyed to the number of
 * scored boards in the half).
 */
function mpRealHalfVp(
  rows: SwissVpBoardRow[],
  boardMp: Map<number, BoardMp>,
): number {
  let mp = 0;
  let max = 0;
  let boards = 0;
  for (const row of rows) {
    const b = boardMp.get(row.boardNumber);
    if (!b) continue;
    mp += b.mp;
    max += b.max;
    boards += 1;
  }
  if (max === 0) return NEUTRAL_VP / 2;
  return mpVpFromPercent(clampPercent((mp / max) * 100), boards, 10);
}

/**
 * A compensated (unplayed) half's VP/10 for one pair (AVE+/AVE credit), via the
 * 10-VP EBU table keyed to the number of boards whose field top is known.
 */
function mpCompensationHalfVp(
  rows: SwissVpBoardRow[],
  topByBoard: Map<number, number>,
): number {
  const fractions = compensationMpFractions(rows.length);
  let mp = 0;
  let max = 0;
  let boards = 0;
  rows.forEach((row, index) => {
    const top = topByBoard.get(row.boardNumber);
    if (top == null) return;
    mp += fractions[index] * top;
    max += top;
    boards += 1;
  });
  if (max === 0) return NEUTRAL_VP / 2;
  return mpVpFromPercent(clampPercent((mp / max) * 100), boards, 10);
}

/**
 * An ordinary (full-round) VP for one pair, from its matchpoint percentage over
 * the round's boards, via the 20-VP EBU table (keyed to the number of scored
 * boards in the round).
 */
function mpOrdinaryVp(boardMp: Map<number, BoardMp>): number {
  let mp = 0;
  let max = 0;
  for (const b of boardMp.values()) {
    mp += b.mp;
    max += b.max;
  }
  if (max === 0) return NEUTRAL_VP;
  return mpVpFromPercent(clampPercent((mp / max) * 100), boardMp.size, 20);
}

/** Score one round in matchpoint mode: per-pair VP + real-half MATCH splits. */
function mpRound(byBoard: Map<number, SwissVpBoardRow[]>): SwissVpRound {
  const { perPairBoard, topByBoard } = buildMpByBoard(byBoard);
  const pairVp = new Map<string, number>();

  for (const pairId of seenPairs(byBoard)) {
    const segments = segmentsForPair(pairId, rowsForPair(byBoard, pairId));
    const boardMp = perPairBoard.get(pairId) ?? new Map<number, BoardMp>();

    const vp = isHalfMatchRound(segments)
      ? segments.reduce(
          (sum, seg) =>
            sum +
            (seg.compensation
              ? mpCompensationHalfVp(seg.rows, topByBoard)
              : mpRealHalfVp(seg.rows, boardMp)),
          0,
        )
      : mpOrdinaryVp(boardMp);

    pairVp.set(pairId, vp);
  }

  const matches = buildMatches(byBoard, (rows, nsId, ewId, isHalf) => {
    const nsVp = isHalf
      ? mpRealHalfVp(rows, perPairBoard.get(nsId) ?? new Map())
      : mpOrdinaryVp(perPairBoard.get(nsId) ?? new Map());
    const ewVp = isHalf
      ? mpRealHalfVp(rows, perPairBoard.get(ewId) ?? new Map())
      : mpOrdinaryVp(perPairBoard.get(ewId) ?? new Map());
    return { nsVp, ewVp };
  });

  return { pairVp, matches };
}

/* ============================================================
   REAL-HALF MATCH ENUMERATION (mode-independent)
============================================================ */

/**
 * Enumerate the round's REAL head-to-head halves and score each with the
 * mode-specific `score` callback.
 *
 * A real half is a (nsId, ewId, board subset) a pair of REAL pairs shares. We
 * find them by walking each pair's segments once and keeping each unordered
 * pair/opponent segment a single time. The anchor of a half-match group yields
 * TWO real halves (its two opponents, two board subsets); an ordinary table
 * yields one. The compensated segment (opponent {@link COMPENSATION_SEGMENT})
 * is skipped — it has only a phantom opponent, so it is never a match.
 */
function buildMatches(
  byBoard: Map<number, SwissVpBoardRow[]>,
  score: (
    rows: SwissVpBoardRow[],
    nsId: string,
    ewId: string,
    isHalf: boolean,
  ) => { nsVp: number; ewVp: number },
): SwissVpMatch[] {
  const matches: SwissVpMatch[] = [];
  const emitted = new Set<string>();

  for (const pairId of seenPairs(byBoard)) {
    const segments = segmentsForPair(pairId, rowsForPair(byBoard, pairId));
    const half = isHalfMatchRound(segments);

    for (const segment of segments) {
      if (segment.compensation) continue;
      if (segment.opponent === COMPENSATION_SEGMENT) continue;

      // Orient the match to the actual NS/EW seats on the segment's rows (the
      // id stored in the row's `ns`/`ew`), so the emitted MATCH matches the
      // physical seating. A pair sits one direction for the whole half.
      const { nsId, ewId, rows } = orientSegment(pairId, segment);

      const key = unorderedKey(nsId, ewId, rows);
      if (emitted.has(key)) continue;
      emitted.add(key);

      const { nsVp, ewVp } = score(rows, nsId, ewId, half);
      matches.push({
        nsId,
        ewId,
        nsVp,
        ewVp,
        boardNumbers: rows
          .map((r) => r.boardNumber)
          .sort((a, b) => a - b),
      });
    }
  }

  // Stable order: by first board, then NS id.
  return matches.sort(
    (a, b) =>
      a.boardNumbers[0] - b.boardNumbers[0] || a.nsId.localeCompare(b.nsId),
  );
}

/** Resolve a segment's NS/EW ids from its rows (both pairs sit a fixed way). */
function orientSegment(
  pairId: string,
  segment: PairSegment<SwissVpBoardRow>,
): { nsId: string; ewId: string; rows: SwissVpBoardRow[] } {
  const [first] = segment.rows;
  // All of a real segment's rows share the same NS/EW seats.
  return { nsId: first.ns, ewId: first.ew, rows: segment.rows };
}

/** A dedupe key for an unordered pair over a board subset. */
function unorderedKey(
  nsId: string,
  ewId: string,
  rows: SwissVpBoardRow[],
): string {
  const [lo, hi] = [nsId, ewId].sort();
  const boards = rows
    .map((r) => r.boardNumber)
    .sort((a, b) => a - b)
    .join(",");
  return `${lo}|${hi}|${boards}`;
}

/* ============================================================
   PUBLIC ENTRY
============================================================ */

/** The Swiss Pairs VP mode a round is scored under. */
export type SwissRoundMode = "XIMP" | "MP";

/**
 * Score a single round's board rows under the given mode, returning each real
 * pair's round VP and the real-half MATCH splits. SIT_OUT rows are ignored;
 * HALF_AVERAGE compensation rows contribute to a non-anchor's `pairVp` but are
 * never a MATCH.
 *
 * `expectedBoards` is the match's full board count (the movement's
 * `boardsPerRound`), used only to size a §3.3.8/§3.3.9 VOID_PAIR pair's
 * AVE+/AVE−/AVE half-board compensation; when absent, a void pair falls back to
 * the number of VOID_PAIR rows it has.
 */
export function scoreSwissVpRound(
  rows: SwissVpBoardRow[],
  mode: SwissRoundMode,
  expectedBoards?: number,
  matchRows: SwissVpMatchRow[] = [],
): SwissVpRound {
  // The §3.3.8 void-pair matches (ruling VOIDP:) are excluded from the field;
  // the §3.5 mismatch matches (ruling MM:) stay in the field but adjust the
  // mismatched side's VP afterwards. Both are read off the match rows.
  const voidedMatchIds = new Set<number>();
  for (const m of matchRows) {
    if (m.kind === "PAIRS" && m.ruling != null && parsePairVoid(m.ruling) != null) {
      voidedMatchIds.add(m.id);
    }
  }

  const byBoard = byBoardOf(rows, voidedMatchIds);
  const result = mode === "MP" ? mpRound(byBoard) : ximpRound(byBoard);

  // §3.3.8/§3.3.9 voided pairs: credited an AVE+/AVE−/AVE half-board blend,
  // scored off the (void-excluded) field top, and added to `pairVp`. Their
  // rows were kept out of `byBoard` so they never skew the field.
  creditVoidPairs(rows, byBoard, mode, expectedBoards, result.pairVp, matchRows);

  // §3.5 mismatch: the match was played for real (its rows stay in the field),
  // but the director has ruled the mismatched side's round VP be adjusted per
  // §3.5.2. Applied LAST, on the already-computed actual VP.
  creditMismatch(rows, result.pairVp, matchRows);
  return result;
}

/**
 * Apply the §3.5.2 mismatch adjustment to the mismatched pair's round VP.
 *
 * A MISMATCH table's two rows carry an `MM:<side>:<direction>:<fault>` token
 * naming which seat (NS/EW) is the mismatched side. The match itself was scored
 * normally (its boards stay in the field), so `pairVp` already holds each
 * pair's actual round VP; we recompute only the mismatched side's value and
 * leave the opponent untouched. The round pool is 20 (a Swiss Pairs round is a
 * full /20 match; §3.5.2's constants are on the 20–0 scale).
 */
function creditMismatch(
  rows: SwissVpBoardRow[],
  pairVp: Map<string, number>,
  matchRows: SwissVpMatchRow[],
): void {
  for (const m of matchRows) {
    if (m.kind !== "PAIRS" || m.ruling == null) continue;
    const ruling = parseMismatch(m.ruling);
    if (ruling == null) continue;

    // The ruling's side is home-relative: NS = the match's `home` pair, EW =
    // its `opponent`. Recompute only the mismatched side's round VP.
    const mismatchedPairId = ruling.side === "NS" ? m.home : m.opponent;
    if (mismatchedPairId == null) continue;

    const actual = pairVp.get(mismatchedPairId);
    if (actual == null) continue;

    pairVp.set(mismatchedPairId, adjustMismatchVp(actual, ruling, 20));
  }
}

/** One voided pair's round: its id, per-pair fault, and the boards it voided. */
interface VoidPairRound {
  pairId: string;
  fault: PairVoidFault;
  boardNumbers: number[];
}

/**
 * Recover the §3.3.8/§3.3.9 voided pairs from a round's raw rows. A VOID_PAIR
 * row is one table (NS vs EW on the same boards) carrying the void CAUSE in
 * `directorOverrideResult`; both seats are voided, each with the fault the
 * cause assigns (`pairVoidFaults`). Emits one entry per pair (NS and EW), keyed
 * by pair id, with the distinct board numbers voided.
 */
function voidPairRounds(
  rows: SwissVpBoardRow[],
  matchRows: SwissVpMatchRow[],
): VoidPairRound[] {
  const byPair = new Map<string, { fault: PairVoidFault; boards: Set<number> }>();

  const add = (pairId: string, fault: PairVoidFault, board: number) => {
    const entry = byPair.get(pairId) ?? { fault, boards: new Set<number>() };
    entry.fault = fault;
    entry.boards.add(board);
    byPair.set(pairId, entry);
  };

  // Group board numbers by matchId so a voided match's boards are recovered.
  const boardsByMatch = new Map<number, Set<number>>();
  for (const row of rows) {
    if (row.matchId == null) continue;
    const set = boardsByMatch.get(row.matchId) ?? new Set<number>();
    set.add(row.boardNumber);
    boardsByMatch.set(row.matchId, set);
  }

  for (const m of matchRows) {
    if (m.kind !== "PAIRS" || m.ruling == null) continue;
    const cause = parsePairVoid(m.ruling);
    if (cause == null) continue;
    // The cause is home-relative: NS = `home`, EW = `opponent`.
    const { ns, ew } = pairVoidFaults(cause);
    const boards = boardsByMatch.get(m.id) ?? new Set<number>();
    for (const board of boards) {
      add(m.home, ns, board);
      if (m.opponent != null) add(m.opponent, ew, board);
    }
  }

  return Array.from(byPair.entries()).map(([pairId, v]) => ({
    pairId,
    fault: v.fault,
    boardNumbers: Array.from(v.boards).sort((a, b) => a - b),
  }));
}

/**
 * Credit each voided pair its §3.3.9 AVE+/AVE−/AVE compensation VP for the
 * round, scored off the void-excluded field, and write it into `pairVp`.
 */
function creditVoidPairs(
  rows: SwissVpBoardRow[],
  byBoard: Map<number, SwissVpBoardRow[]>,
  mode: SwissRoundMode,
  expectedBoards: number | undefined,
  pairVp: Map<string, number>,
  matchRows: SwissVpMatchRow[],
): void {
  const voids = voidPairRounds(rows, matchRows);
  if (voids.length === 0) return;

  if (mode === "MP") {
    const { topByBoard } = buildMpByBoard(byBoard);
    for (const v of voids) {
      pairVp.set(v.pairId, voidMpVp(v, topByBoard, expectedBoards));
    }
  } else {
    const { fieldByBoard } = buildXimpByBoard(byBoard);
    for (const v of voids) {
      pairVp.set(v.pairId, voidXimpVp(v, fieldByBoard, expectedBoards));
    }
  }
}

/**
 * A voided pair's matchpoint VP/20: an AVE+/AVE−/AVE blend over the match's
 * boards, matchpointed off the (void-excluded) field top per board. The number
 * of boards is `expectedBoards` (the full match) when known, else the count of
 * the pair's voided rows. Boards whose field top is unknown (nobody else played
 * them) fall back to a flat 50% top so the blend is still defined.
 */
function voidMpVp(
  v: VoidPairRound,
  topByBoard: Map<number, number>,
  expectedBoards: number | undefined,
): number {
  const boards = expectedBoards && expectedBoards > 0
    ? expectedBoards
    : v.boardNumbers.length;
  if (boards <= 0) return NEUTRAL_VP;

  const fractions = voidMpFractions(boards, v.fault);
  // Use the pair's own voided board tops where known; otherwise the median-ish
  // top of the round, so the AVE blend has a scale even for a board nobody else
  // played. We approximate an unknown top with the max known top of the round.
  const knownTops = Array.from(topByBoard.values());
  const fallbackTop =
    knownTops.length > 0 ? Math.max(...knownTops) : 0;

  let mp = 0;
  let max = 0;
  for (let i = 0; i < boards; i++) {
    const boardNumber = v.boardNumbers[i];
    const top =
      (boardNumber != null ? topByBoard.get(boardNumber) : undefined) ??
      fallbackTop;
    if (top <= 0) continue;
    mp += fractions[i] * top;
    max += top;
  }
  if (max === 0) return NEUTRAL_VP;
  return mpVpFromPercent(clampPercent((mp / max) * 100), boards, 20);
}

/**
 * A voided pair's cross-IMP VP/20: an AVE+/AVE−/AVE blend over the match's
 * boards in XIMPQ, off the (void-excluded) field metadata per board. Boards
 * with no field metadata contribute nothing (no comparison to scale against).
 */
function voidXimpVp(
  v: VoidPairRound,
  fieldByBoard: Map<number, XimpField>,
  expectedBoards: number | undefined,
): number {
  const boards = expectedBoards && expectedBoards > 0
    ? expectedBoards
    : v.boardNumbers.length;
  if (boards <= 0) return NEUTRAL_VP;

  const perComparison = voidXimpPerComparison(boards, v.fault);
  let ximpq = 0;
  let boardsScored = 0;
  for (let i = 0; i < boards; i++) {
    const boardNumber = v.boardNumbers[i];
    const field = boardNumber != null ? fieldByBoard.get(boardNumber) : undefined;
    if (!field) continue;
    ximpq += (perComparison[i] * field.comparisons) / field.normaliser;
    boardsScored += 1;
  }
  if (boardsScored === 0) return NEUTRAL_VP;
  return impVpSided(roundHalfAwayFromZero(ximpq), boards, 20);
}
