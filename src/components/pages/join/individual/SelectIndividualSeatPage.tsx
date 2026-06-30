"use client";

import { useState } from "react";
import SelectIndividualTable from "@/components/join/individual/SelectIndividualTable";
import { useGame } from "@/context/GameContext";
import { PlayerInitialSeat } from "@/db/games/shared/queries/find-player-initial-seats";
import { useSocketSWRSync } from "@/hooks/socket-swr-sync";
import { fetcher } from "@/lib/fetcher";
import { SocketEvents } from "@/socket/socket-events";
import { swrKeys } from "@/swr/swr-keys";
import useSWR from "swr";
import EnterIndividualPlayerNames from "@/components/join/individual/EnterIndividualPlayerNames";
import { Seat } from "@/model/participants";
import { NewPlayer } from "@/db/games/shared/tables/players";
import { GameInfo } from "@/components/common/GameInfo";

interface Props {
  onSeatSelected: (seat: Seat) => void;
}

export function SelectIndividualSeatPage({ onSeatSelected }: Props) {
  const { game } = useGame();
  const gameId = game?.gameId;

  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);

  const key = gameId ? swrKeys.individualInitialSeats(gameId) : null;

  const { data } = useSWR<PlayerInitialSeat[], Error>(key, fetcher);

  useSocketSWRSync(
    SocketEvents.STARTING_POSITIONS,
    (p) => ({
      key: swrKeys.individualInitialSeats(gameId!),
      data: p.startingPositions,
    }),
    [gameId],
  );

  if (!gameId) {
    return null;
  }

  const handleSeatSelected = (seat: Seat) => {
    setSelectedSeat(seat);
  };

  const handlePlayerSubmitted = (player: NewPlayer) => {
    // setSelectedSeat(seat);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <div className="flex flex-row w-full">
        <GameInfo />
      </div>

      {/* Main table selection */}
      <SelectIndividualTable
        onSeatSelected={handleSeatSelected}
        tables={game.tables}
        startingPositions={data ?? []}
      />

      {/* Backdrop */}
      {selectedSeat && (
        <div
          className="fixed inset-0 bg-black/30"
          onClick={() => setSelectedSeat(null)}
        />
      )}

      {/* Bottom sheet */}
      <div
        className={`
          fixed bottom-0 left-0 right-0
          bg-white
          shadow-2xl
          rounded-t-2xl
          transform
          transition-transform duration-300 ease-out
          ${selectedSeat ? "translate-y-0" : "translate-y-full"}
        `}
      >
        {selectedSeat && (
          <EnterIndividualPlayerNames
            seat={selectedSeat}
            onSubmitPlayer={handlePlayerSubmitted}
          />
        )}
      </div>
    </div>
  );
}
