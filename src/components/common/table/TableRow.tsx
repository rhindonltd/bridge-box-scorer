import { TableCell } from "@/components/common/table/TableCell";
import { ReactNode } from "react";

type Props = {
  cells: ReactNode[];
  className: string;
  highlighted?: boolean;
  /**
   * Whether the row participates in zebra striping. Turn this off when a table
   * highlights a specific row, so the highlight is the only emphasis.
   */
  striped?: boolean;
};

export function TableRow({
  cells,
  className,
  highlighted = false,
  striped = true,
}: Props) {
  const rowClass = highlighted
    ? "bg-blue-100 even:bg-blue-100 hover:bg-blue-200 font-semibold"
    : striped
      ? "even:bg-gray-200 hover:bg-gray-300"
      : "hover:bg-gray-100";

  return (
    <tr className={`${rowClass} ${className}`}>
      {cells.map((cell, index) => {
        const isLast = index === cells.length - 1;
        // The top-corner radii are only meant to soften the very first row.
        // On a highlighted row the solid background makes them visible mid
        // table, so drop them when highlighted.
        const cornerClass = highlighted
          ? ""
          : index == 0
            ? "rounded-tl-lg"
            : isLast
              ? "rounded-tr-lg"
              : "";
        return <TableCell key={index} value={cell} className={cornerClass} />;
      })}
    </tr>
  );
}
