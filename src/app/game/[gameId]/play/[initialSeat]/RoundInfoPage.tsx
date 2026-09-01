"use client";

import RoundInfo from "@/app/game/[gameId]/play/[initialSeat]/RoundInfo";
import React from "react";
import { Player } from "@/db/games/tables/players";
import { GamePageLayout } from "@/components/layout/GamePageLayout";

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
    <GamePageLayout
      headerTitle={`Table ${table}, Round ${round}`}
      centerContent={true}
      actions={
        <button
          onClick={onEnterRound}
          className="w-full max-w-[360px] py-3 text-lg font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          Enter Round
        </button>
      }
    >
      <RoundInfo boards={boards} table={table} players={players} />
    </GamePageLayout>
  );
}
