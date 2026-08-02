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
        <div>
          {boards.length === 1 ? "Board" : "Boards"} {formatBoardRange(boards)}
        </div>
      </header>
      <CardTable tableNumber={table} players={players} />
    </div>
  );
}

function formatBoardRange(boards: number[]): string {
  if (boards.length === 0) return "";
  if (boards.length === 1) return String(boards[0]);

  const sorted = [...boards].sort((a, b) => a - b);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  // Check if boards are consecutive
  const isConsecutive = last - first === sorted.length - 1;

  if (isConsecutive) {
    return `${first} to ${last}`;
  }

  return sorted.join(", ");
}
