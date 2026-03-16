import React from "react";
import CardTable from "@/components/common/CardTable";

interface PlayerName {
  firstName: string;
  lastName: string;
}

interface Props {
  roundNumber: number;
  tableNumber: number;
  boards: number[];
  players: {
    N: PlayerName;
    S: PlayerName;
    E: PlayerName;
    W: PlayerName;
  };
  onEnterRound: () => void;
}

export default function RoundInfo({
  roundNumber,
  tableNumber,
  boards,
  players,
  onEnterRound,
}: Props) {
  return (
    <div className="flex flex-col justify-between items-center min-h-screen p-4 bg-slate-100 font-sans">
      <div className="flex flex-col items-center justify-center flex-1 w-full">
        <header className="flex flex-col items-center text-lg font-bold mb-6 gap-1">
          <div>Round: {roundNumber}</div>
          <div>Table: {tableNumber}</div>
          <div>Boards: {boards.join(", ")}</div>
        </header>
        <CardTable tableNumber={tableNumber} players={players} />
      </div>

      <button
        onClick={onEnterRound}
        className="w-full max-w-[360px] py-3 text-lg font-bold bg-blue-600 text-white rounded-lg mt-4 hover:bg-blue-700 active:scale-[0.98] transition"
      >
        Enter Round
      </button>
    </div>
  );
}
