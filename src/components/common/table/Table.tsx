import { ReactNode } from "react";
import { TableHead } from "@/components/common/table/TableHead";
import { TableBody } from "@/components/common/table/TableBody";

type Props = {
  columns: string[];
  body: ReactNode;
};

export function Table({ columns, body }: Props) {
  return (
    <div className="flex flex-col h-full min-h-0 mx-2 mt-2">
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto">
        <table className="min-w-full shadow-sm rounded-lg border border-gray-200 divide-y divide-gray-200 text-sm">
          <TableHead columns={columns} />
          <TableBody body={body} />
        </table>
      </div>
    </div>
  );
}
