"use client";

import { Tables } from "@/model/movement";
import MovementTable from "@/components/movement/MovementTable";

type Props = {
  tables: Tables;
};

export default function MovementTables({ tables }: Props) {
  return (
    <div className="p-6 space-y-8">
      {tables.tables.map((table) => (
        <MovementTable key={table.table} table={table} />
      ))}
    </div>
  );
}
