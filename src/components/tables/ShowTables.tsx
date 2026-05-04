import CardTable from "@/components/common/CardTable";
import React from "react";

interface PlayerName {
  firstName: string;
  lastName: string;
}

interface Players {
  N?: PlayerName;
  S?: PlayerName;
  E?: PlayerName;
  W?: PlayerName;
}

interface Table {
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
            <div className="p-6">
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
