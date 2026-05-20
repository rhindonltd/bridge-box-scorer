import CardTable from "@/components/common/CardTable";
import { StartingPositionWithPlayer } from "@/db/games/shared/queries/find-starting-positions";
import { Player } from "@/db/games/shared/tables/players";
import React from "react";

interface Players {
  N: Omit<Player, "id"> | null;
  S: Omit<Player, "id"> | null;
  E: Omit<Player, "id"> | null;
  W: Omit<Player, "id"> | null;
}

interface Table {
  tableNumber: number;
  players: Players;
}

interface Props {
  tables: number;
  startingPositions: StartingPositionWithPlayer[];
}

export default function ShowTables({ tables, startingPositions }: Props) {
  function createTables(count: number): Table[] {
    return Array.from({ length: count }, (_, i) => createTable(i + 1));
  }

  function createTable(tableNumber: number): Table {
    const playersByDirection = Object.fromEntries(
      startingPositions
        .filter((x) => x.tableNumber === tableNumber)
        .map((x) => [x.direction, x.player]),
    );

    return {
      tableNumber,
      players: {
        N: playersByDirection.N ?? null,
        S: playersByDirection.S ?? null,
        E: playersByDirection.E ?? null,
        W: playersByDirection.W ?? null,
      },
    };
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {createTables(tables).map((table) => (
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
