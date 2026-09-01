import { BoardOutcome } from "@/model/score";

/**
 * Framework-free, semantic description of a table produced by a scoring
 * plugin. The domain layer decides *what* to show (columns, cell values, which
 * rows to highlight); a display component decides *how* to render each cell
 * kind. This keeps `src/scoring/` free of React while still co-locating the
 * "what to show" decision with the scoring algorithm.
 */

/** A single cell in a scored table. */
export type ScoreCell =
  | { kind: "text"; value: string }
  | { kind: "multiline"; values: string[] }
  | { kind: "number"; value: number; decimals?: number }
  | { kind: "contract"; outcome: BoardOutcome };

export interface ScoreColumn {
  /** Header label shown at the top of the column. */
  label: string;
}

export interface ScoreRow {
  /** Cells in column order. Length must match `columns`. */
  cells: ScoreCell[];
  /**
   * Participant ids associated with this row (e.g. the NS and EW pair ids).
   * A row is highlighted when the active assignment id is one of these.
   */
  highlightIds: string[];
}

export interface ScoreTable {
  columns: ScoreColumn[];
  rows: ScoreRow[];
}

/* ---------- cell constructors (convenience) ---------- */

export function textCell(value: string): ScoreCell {
  return { kind: "text", value };
}

/** A left-aligned stack of text lines (e.g. the two players of a pair). */
export function multilineCell(values: string[]): ScoreCell {
  return { kind: "multiline", values };
}

export function numberCell(value: number, decimals?: number): ScoreCell {
  return { kind: "number", value, decimals };
}

export function contractCell(outcome: BoardOutcome): ScoreCell {
  return { kind: "contract", outcome };
}

/** Format a number cell to its display string. */
export function formatNumberCell(cell: {
  value: number;
  decimals?: number;
}): string {
  return cell.decimals !== undefined
    ? cell.value.toFixed(cell.decimals)
    : `${cell.value}`;
}
