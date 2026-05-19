import React from "react";
import CardTable from "@/components/common/CardTable";
import { Player } from "@/db/games/shared/tables/players";

interface Props {
  table: number;
  boards: number[];
  players: {
    N: Player;
    S: Player;
    E: Player;
    W: Player;
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
