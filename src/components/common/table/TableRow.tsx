import { TableCell } from "@/components/common/table/TableCell";
import { ReactNode } from "react";

type Props = {
  cells: ReactNode[];
  className: string;
};

export function TableRow({ cells, className }: Props) {
  return (
    <tr className={`even:bg-gray-200 hover:bg-gray-300 ${className}`}>
      {cells.map((cell, index) => {
        const isLast = index === cells.length - 1;
        return (
          <TableCell
            key={index}
            value={cell}
            className={
              index == 0 ? "rounded-tl-lg" : isLast ? "rounded-tr-lg" : ""
            }
          />
        );
      })}
    </tr>
  );
}
