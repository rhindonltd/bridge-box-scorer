import { outcomeToScore, computeCrossImps } from "@/scoring/traveller/common";
import { scoreMP } from "@/scoring/traveller/pair/mp";
import { impsToVp } from "./wbf-vp";
import { mpVpFromPercent } from "./mp-vp-table";
import { NEUTRAL_VP, SwissVpBoardRow } from "./swiss-vp-overall";
import { boardResult } from "./team-match";
import {
  COMPENSATION_SEGMENT,
  PairSegment,
  compensationMpFractions,
  compensationXimpPerComparison,
  isHalfMatchRound,
  segmentsForPair,
  ximpHalfVp,
} from "./swiss-half-match";

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

/** Group a round's non-sit-out rows by board number. */
function byBoardOf(rows: SwissVpBoardRow[]): Map<number, SwissVpBoardRow[]> {
  const byBoard = new Map<number, SwissVpBoardRow[]>();
  for (const row of rows) {
    if (row.status === "SIT_OUT") continue;
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
  return ximpHalfVp(boardsPlayed, roundHalfAwayFromZero(ximpq), "discrete");
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
  return ximpHalfVp(boardsPlayed, roundHalfAwayFromZero(ximpq), "discrete");
}

/** An ordinary (full-round) VP for one pair, on the 20-VP scale. */
function ximpOrdinaryVp(boardXimp: Map<number, number>): number {
  const boardsPlayed = boardXimp.size;
  if (boardsPlayed === 0) return NEUTRAL_VP;
  let ximpq = 0;
  for (const q of boardXimp.values()) ximpq += q;
  return impsToVp(boardsPlayed, roundHalfAwayFromZero(ximpq), "discrete");
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

  for (const [boardNumber, rows] of byBoard) {
    const scored = scoreMP(
      boardNumber,
      rows
        .filter((r) => boardResult(r) != null)
        .map((r) => ({ nsId: r.ns, ewId: r.ew, outcome: boardResult(r)! })),
    );

    for (const line of scored) {
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
  return mpVpFromPercent((mp / max) * 100, boards, 10);
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
  return mpVpFromPercent((mp / max) * 100, boards, 10);
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
  return mpVpFromPercent((mp / max) * 100, boardMp.size, 20);
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
 */
export function scoreSwissVpRound(
  rows: SwissVpBoardRow[],
  mode: SwissRoundMode,
): SwissVpRound {
  const byBoard = byBoardOf(rows);
  return mode === "MP" ? mpRound(byBoard) : ximpRound(byBoard);
}
