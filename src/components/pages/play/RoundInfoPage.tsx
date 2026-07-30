"use client";

import RoundInfo from "@/components/play/RoundInfo";
import React from "react";
import { TableRoundPairBoardInfo } from "@/components/common/TableRoundPairBoardInfo";
import { Player } from "@/db/games/shared/tables/players";
import { GameInfo } from "@/components/common/GameInfo";
import { ParticipantInfo } from "@/components/common/ParticipantInfo";

interface Props {
  round: number;
  table: number;
  boards: number[];
  players: {
    N: Player;
    S: Player;
    E: Player;
    W: Player;
  };
  onEnterRound: () => void;
}

export function RoundInfoPage({
  round,
  table,
  boards,
  players,
  onEnterRound,
}: Props) {
  return (
    <div className="h-dvh flex flex-col bg-gray-100">
      <div className="flex flex-row w-full">
        <GameInfo />
        <ParticipantInfo />
      </div>

      <div className="w-full">
        <TableRoundPairBoardInfo round={round} table={table} />
      </div>

      <div className="flex-1 flex items-center justify-center p-2 min-h-0">
        <RoundInfo boards={boards} table={table} players={players} />
      </div>

      <div className="p-2 flex justify-center">
        <button
          onClick={onEnterRound}
          className="w-full max-w-[360px] py-3 text-lg font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          Enter Round
        </button>
      </div>
    </div>
  );
}
