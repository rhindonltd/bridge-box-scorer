import React from "react";
import CardTable from "@/components/common/CardTable";

interface PlayerName {
  firstName: string;
  lastName: string;
}

interface Props {
  table: number;
  boards: number[];
  players: {
    N: PlayerName;
    S: PlayerName;
    E: PlayerName;
    W: PlayerName;
  };
}

export default function RoundInfo({ table, boards, players }: Props) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 w-full">
      <header className="flex flex-col items-center text-lg font-bold mb-6 gap-1">
        <div>Boards: {boards.join(", ")}</div>
      </header>
      <CardTable tableNumber={table} players={players} />
    </div>
  );
}
