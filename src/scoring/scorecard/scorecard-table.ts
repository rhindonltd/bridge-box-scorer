import type { BoardOutcome } from "@/model/score";
import type { PairScorecard, ScorecardBoard } from "@/model/scorecard";
import { pairLabel } from "@/model/pair-label";
import {
  type ScoreCell,
  type ScoreRow,
  type ScoreTable,
  contractCell,
  numberCell,
  textCell,
} from "@/scoring/table/score-table";

/**
 * The ways a scorecard's per-board score can be shown. Matchpoint events offer
 * a % / MP toggle (percentage first, like the leaderboard); IMP and Cross-IMP
 * events have a single view.
 */
export type ScorecardViewId =
  "percentage" | "matchpoints" | "imps" | "cross-imps";

export interface ScorecardView {
  id: ScorecardViewId;
  label: string;
}

/** The views available for a scorecard, in toggle order. */
export function scorecardViews(card: PairScorecard): ScorecardView[] {
  switch (card.scoring) {
    case "MP":
      return [
        { id: "percentage", label: "%" },
        { id: "matchpoints", label: "MP" },
      ];
    case "IMP":
      return [{ id: "imps", label: "IMPs" }];
    case "XIMP":
      return [{ id: "cross-imps", label: "X-IMPs" }];
  }
}

export interface ScorecardTableOptions {
  /** Drop the section prefix from opponents' pair numbers ("A3EW" -> "3EW"). */
  hideSection?: boolean;
}

/** A number for display: whole numbers as-is, otherwise up to two decimals. */
function formatNumber(value: number): string {
  return Number.isInteger(value) ? `${value}` : `${Number(value.toFixed(2))}`;
}

/** This board's matchpoints as a percentage of the top (50% when no top yet). */
function percentOf(mp: { value: number; max: number }): number {
  return mp.max === 0 ? 50 : (mp.value / mp.max) * 100;
}

function valueCell(board: ScorecardBoard, view: ScorecardViewId): ScoreCell {
  switch (view) {
    case "percentage":
      return numberCell(
        percentOf(board.matchpoints ?? { value: 0, max: 0 }),
        2,
      );
    case "matchpoints": {
      const mp = board.matchpoints ?? { value: 0, max: 0 };
      return textCell(`${formatNumber(mp.value)}/${formatNumber(mp.max)}`);
    }
    case "imps":
      return textCell(formatNumber(board.imps ?? 0));
    case "cross-imps":
      return numberCell(board.crossImps ?? 0, 2);
  }
}

function totalCell(boards: ScorecardBoard[], view: ScorecardViewId): ScoreCell {
  switch (view) {
    case "percentage":
    case "matchpoints": {
      const value = boards.reduce((s, b) => s + (b.matchpoints?.value ?? 0), 0);
      const max = boards.reduce((s, b) => s + (b.matchpoints?.max ?? 0), 0);
      return view === "percentage"
        ? numberCell(percentOf({ value, max }), 2)
        : textCell(`${formatNumber(value)}/${formatNumber(max)}`);
    }
    case "imps":
      return textCell(
        formatNumber(boards.reduce((s, b) => s + (b.imps ?? 0), 0)),
      );
    case "cross-imps":
      return numberCell(
        boards.reduce((s, b) => s + (b.crossImps ?? 0), 0),
        2,
      );
  }
}

/**
 * The scorecard's board table: one row per board this pair has played, then a
 * Total row. Columns: board, the side the pair sat (only when it changed
 * during the event — in a Mitchell it is always the same, and already part of
 * the pair number), opponents, contract / result, the pair's raw score on the
 * board (from its own point of view), and the chosen score view.
 *
 * The figures are each board's own score, as on the Board Results screen, so
 * the Total is the sum of the rows shown.
 */
export function buildScorecardTable(
  card: PairScorecard,
  view: ScorecardViewId,
  { hideSection = false }: ScorecardTableOptions = {},
): ScoreTable {
  const viewLabel =
    scorecardViews(card).find((v) => v.id === view)?.label ?? "";
  const showSide = new Set(card.boards.map((b) => b.side)).size > 1;

  const columns = [
    { label: "Bd" },
    ...(showSide ? [{ label: "Dir" }] : []),
    { label: "Vs" },
    { label: "Contract" },
    { label: "Score" },
    { label: viewLabel },
  ];

  const rows: ScoreRow[] = card.boards.map((board) => ({
    highlightIds: [],
    cells: [
      textCell(`${board.boardNumber}`),
      ...(showSide ? [textCell(board.side)] : []),
      textCell(pairLabel(board.opponentId, hideSection)),
      contractCell(board.outcome as BoardOutcome),
      board.score == null ? textCell("") : numberCell(board.score),
      valueCell(board, view),
    ],
  }));

  if (card.boards.length > 0) {
    rows.push({
      // Highlighted so the total stands out from the board rows.
      highlightIds: [card.pairId],
      cells: [
        textCell("Total"),
        ...(showSide ? [textCell("")] : []),
        textCell(""),
        textCell(""),
        textCell(""),
        totalCell(card.boards, view),
      ],
    });
  }

  return { columns, rows };
}

/**
 * Swiss Pairs only: the Victory Points this pair earned in each round, then a
 * Total row. Null when the event has no per-round VP.
 */
export function buildScorecardVpTable(
  card: PairScorecard,
  { hideSection = false }: ScorecardTableOptions = {},
): ScoreTable | null {
  if (!card.roundVps || card.roundVps.length === 0) return null;

  const rows: ScoreRow[] = card.roundVps.map((round) => ({
    highlightIds: [],
    cells: [
      textCell(`${round.roundNumber}`),
      textCell(
        round.opponentId ? pairLabel(round.opponentId, hideSection) : "",
      ),
      numberCell(round.vp, 2),
    ],
  }));
  rows.push({
    highlightIds: [card.pairId],
    cells: [
      textCell("Total"),
      textCell(""),
      numberCell(
        card.roundVps.reduce((s, r) => s + r.vp, 0),
        2,
      ),
    ],
  });

  return {
    columns: [{ label: "Round" }, { label: "Vs" }, { label: "VP" }],
    rows,
  };
}
