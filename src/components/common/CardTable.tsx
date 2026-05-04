import PlayerCard from "@/components/common/PlayerCard";
import React from "react";

interface PlayerName {
  firstName: string;
  lastName: string;
}

interface Players {
  N: PlayerName | null;
  S: PlayerName | null;
  E: PlayerName | null;
  W: PlayerName | null;
}

interface Props {
  tableNumber: number;
  players: Players;
}

import TableCompassLayout from "@/components/layout/TableCompassLayout";

export default function CardTable({ players, tableNumber }: Props) {
  return (
    <TableCompassLayout
      north={<PlayerCard label="North" player={players.N} />}
      south={<PlayerCard label="South" player={players.S} />}
      west={<PlayerCard label="West" player={players.W} />}
      east={<PlayerCard label="East" player={players.E} />}
      center={
        <div className="flex flex-col items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg">
          <div className="text-[10px] font-bold">Table</div>
          <div className="text-xl font-bold">{tableNumber}</div>
        </div>
      }
    />
  );
}
