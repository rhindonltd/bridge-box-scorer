import { BoardResult } from "@/components/traveller/BoardResult";
import { Table } from "@/components/common/table/Table";
import { TableRow } from "@/components/common/table/TableRow";
import {
  ScoreCell,
  ScoreTable,
  formatNumberCell,
} from "@/scoring/table/score-table";
import { ReactNode } from "react";

type Props = {
  table: ScoreTable;
  /**
   * When set, any row whose `highlightIds` includes this id is highlighted and
   * zebra striping is disabled (mirroring the previous per-table behaviour).
   */
  highlightAssignmentId?: string;
};

function renderCell(cell: ScoreCell, key: number): ReactNode {
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
  }
}

/**
 * Renders a framework-free {@link ScoreTable} using the shared table
 * primitives. This is the single flexible table component that every scoring
 * plugin renders through, so column layout and cell content are driven by
 * plugin data rather than bespoke per-scoring-type components.
 */
export function ScoreTableView({ table, highlightAssignmentId }: Props) {
  return (
    <Table
      columns={table.columns.map((c) => c.label)}
      body={table.rows.map((row, index, arr) => {
        const isLast = index === arr.length - 1;
        const highlighted =
          highlightAssignmentId !== undefined &&
          row.highlightIds.includes(highlightAssignmentId);

        return (
          <TableRow
            key={index}
            highlighted={highlighted}
            striped={highlightAssignmentId === undefined}
            cells={row.cells.map((cell, cellIndex) =>
              renderCell(cell, cellIndex),
            )}
            className={isLast ? "rounded-bl-lg rounded-br-lg" : ""}
          />
        );
      })}
    />
  );
}
