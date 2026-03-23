"use client";

import { Tables } from "@/model/movement";
import MovementTable from "@/components/movement/MovementTable";

type Props = {
  name: string;
  tables: Tables;
};

export default function MovementTables({ name, tables }: Props) {
  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold mb-4">{name}</h1>

      {tables.tables.map((table) => (
        <MovementTable key={table.table} table={table} />
      ))}
    </div>
  );
}
