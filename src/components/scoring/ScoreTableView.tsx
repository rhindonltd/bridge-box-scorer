import { BoardResult } from "@/components/traveller/BoardResult";
import { Table } from "@/components/common/table/Table";
import { TableRow } from "@/components/common/table/TableRow";
import type { ColumnAlign } from "@/components/common/table/TableHead";
import {
  ScoreCell,
  ScoreTable,
  formatNumberCell,
} from "@/scoring/table/score-table";
import { ReactNode, useState } from "react";

type Props = {
  table: ScoreTable;
  /**
   * When set, any row whose `highlightIds` includes this id is highlighted and
   * zebra striping is disabled (mirroring the previous per-table behaviour).
   */
  highlightAssignmentId?: string;
  /**
   * When set, each data row is given `data-testid="{rowTestId}"` so tests can
   * count/select the rendered rows (which are otherwise keyed only by index).
   */
  rowTestId?: string;
  /**
   * Render the rows across this many side-by-side tables (default 1). Used by
   * the room-display leaderboard to spread a long list across a wide TV screen
   * so more places are visible without scrolling. Rows are split into this many
   * roughly-equal, order-preserving chunks; each chunk repeats the header. Any
   * value <= 1 renders a single table exactly as before.
   */
  splitColumns?: number;
  /**
   * Whether each rendered table owns its own vertical scroll region (default
   * true). Set false when an ancestor already scrolls (the room-display
   * leaderboard) so the sticky header pins to that outer region instead of a
   * redundant inner one.
   */
  scroll?: boolean;
  /**
   * Whether cells may be interactive (default true). Set false on passive
   * screens (the room display, which nobody taps): an `expandable` cell then
   * renders as its static label instead of a button that reveals detail lines.
   */
  interactive?: boolean;
};

/**
 * A column is left-aligned when its cells hold left-aligned content (a name
 * stack or a team-name label), so the header sits over the names rather than
 * centred. Cell kinds are homogeneous down a column, so the first row decides.
 */
function columnAligns(table: ScoreTable): ColumnAlign[] {
  const firstRow = table.rows[0];
  return table.columns.map((_, i) => {
    const kind = firstRow?.cells[i]?.kind;
    return kind === "multiline" || kind === "expandable" ? "left" : "center";
  });
}

/** Split an array into `count` roughly-equal, order-preserving chunks. */
function splitIntoChunks<T>(items: T[], count: number): T[][] {
  // Defensive: the only caller (the multi-column render path) guards with
  // `splitColumns <= 1` and returns early before ever calling this, so
  // `count <= 1` here is unreachable in practice.
  /* v8 ignore next */
  if (count <= 1) return [items];
  const perChunk = Math.ceil(items.length / count);
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += perChunk) {
    chunks.push(items.slice(i, i + perChunk));
  }
  // Guarantee exactly `count` chunks (pad with empties) so the columns stay a
  // consistent width even when there are fewer rows than columns.
  while (chunks.length < count) chunks.push([]);
  return chunks;
}

/**
 * A summary label (e.g. a team name) that toggles a stack of detail lines
 * (e.g. its four players) when tapped. Rendered as an accessible, keyboard-
 * focusable button with `aria-expanded`.
 */
function ExpandableCell({ label, lines }: { label: string; lines: string[] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="text-left">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        className="text-left font-medium underline decoration-dotted underline-offset-2"
      >
        {label}
      </button>
      {expanded && (
        <div className="mt-1 text-sm text-gray-600">
          {lines.map((value, i) => (
            <div key={i}>{value}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function renderCell(
  cell: ScoreCell,
  key: number,
  interactive: boolean,
): ReactNode {
  switch (cell.kind) {
    case "text":
      return cell.value;
    case "multiline":
      return (
        <div className="text-left">
          {cell.values.map((value, i) => (
            <div key={i}>{value}</div>
          ))}
        </div>
      );
    case "number":
      return formatNumberCell(cell);
    case "contract":
      return <BoardResult key={key} boardOutcome={cell.outcome} />;
    case "expandable":
      // On a passive screen (the room display) the label is not tappable, so
      // render it as static, left-aligned text instead of an expand button.
      return interactive ? (
        <ExpandableCell key={key} label={cell.label} lines={cell.lines} />
      ) : (
        <div className="text-left font-medium">{cell.label}</div>
      );
  }
}

/**
 * Renders a framework-free {@link ScoreTable} using the shared table
 * primitives. This is the single flexible table component that every scoring
 * plugin renders through, so column layout and cell content are driven by
 * plugin data rather than bespoke per-scoring-type components.
 */
export function ScoreTableView({
  table,
  highlightAssignmentId,
  rowTestId,
  splitColumns = 1,
  scroll = true,
  interactive = true,
}: Props) {
  const columns = table.columns.map((c) => c.label);
  const aligns = columnAligns(table);

  const renderRows = (rows: typeof table.rows) =>
    rows.map((row, index, arr) => {
      const isLast = index === arr.length - 1;
      const highlighted =
        highlightAssignmentId !== undefined &&
        row.highlightIds.includes(highlightAssignmentId);

      return (
        <TableRow
          key={index}
          highlighted={highlighted}
          striped={highlightAssignmentId === undefined}
          testId={rowTestId}
          cells={row.cells.map((cell, cellIndex) =>
            renderCell(cell, cellIndex, interactive),
          )}
          className={isLast ? "rounded-bl-lg rounded-br-lg" : ""}
        />
      );
    });

  // Single-table (default) path — unchanged for every existing caller.
  if (splitColumns <= 1) {
    return (
      <Table
        columns={columns}
        aligns={aligns}
        body={renderRows(table.rows)}
        scroll={scroll}
      />
    );
  }

  // Multi-column path: split the rows across N side-by-side tables so a long
  // list fills a wide TV screen. Each column repeats the header.
  const chunks = splitIntoChunks(table.rows, splitColumns);
  return (
    // `items-start` (rather than stretch) lets each column size to its own
    // content, so the inner tables never become their own scroll regions — the
    // surrounding page owns the scrolling. Columns stay top-aligned.
    <div className="flex items-start gap-4">
      {chunks.map((chunk, i) => (
        <div key={i} className="min-w-0 flex-1">
          <Table
            columns={columns}
            aligns={aligns}
            body={renderRows(chunk)}
            scroll={scroll}
          />
        </div>
      ))}
    </div>
  );
}
