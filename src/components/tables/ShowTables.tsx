import CardTable from "@/components/common/CardTable";
import { Player } from "@/db/games/tables/players";
import React from "react";

interface Players {
  N: Player | null;
  S: Player | null;
  E: Player | null;
  W: Player | null;
}

export interface Table {
  tableNumber: number;
  players: Players;
}

interface Props {
  tables: Table[];
}

export default function ShowTables({ tables }: Props) {
  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {tables.map((table) => (
          <div
            key={table.tableNumber}
            className="bg-white border border-gray-200 rounded-2xl shadow-md hover:shadow-xl transition-shadow duration-200"
          >
            <div className="p-4 sm:p-6">
              <CardTable
                tableNumber={table.tableNumber}
                players={table.players}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
