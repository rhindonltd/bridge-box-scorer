"use client";

import SelectPairsTable from "@/components/join/pairs/SelectPairsTable";
import { useGame } from "@/context/GameContext";
import { PairInitialSeat } from "@/db/games/pairs/queries/find-pair-initial-seats";
import { useSocketSWRSync } from "@/hooks/socket-swr-sync";
import { fetcher } from "@/lib/fetcher";
import { SocketEvents } from "@/socket/socket-events";
import { swrKeys } from "@/swr/swr-keys";
import { useState } from "react";
import useSWR from "swr";
import { PairSeat } from "@/model/participants";
import { NewPlayer } from "@/db/games/shared/tables/players";
import EnterPairPlayerNames from "@/components/join/pairs/EnterPairPlayerNames";
import { GameInfo } from "@/components/common/GameInfo";

interface Props {
  onSeatSelected: (seat: PairSeat) => void;
}

export function SelectPairSeatPage({ onSeatSelected }: Props) {
  const { game } = useGame();
  const gameId = game?.gameId;

  const [selectedSeat, setSelectedSeat] = useState<PairSeat | null>(null);

  const key = gameId ? swrKeys.pairsInitialSeats(gameId) : null;

  const { data } = useSWR<PairInitialSeat[], Error>(key, fetcher);

  if (!gameId) {
    return null;
  }

  useSocketSWRSync(
    SocketEvents.STARTING_POSITIONS,
    (p) => ({
      key: swrKeys.pairsInitialSeats(gameId),
      data: p.startingPositions,
    }),
    [gameId],
  );

  const handleSeatSelected = (seat: PairSeat) => {
    setSelectedSeat(seat);
  };

  const handlePairSubmitted = (player1: NewPlayer, player2: NewPlayer) => {
    // setSelectedSeat(seat);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
        <div className="flex flex-row w-full">
            <GameInfo />
        </div>

      {/* Main table selection */}
      <SelectPairsTable
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
          <EnterPairPlayerNames
            seat={selectedSeat}
            onSubmitPair={handlePairSubmitted}
          />
        )}
      </div>
    </div>
  );
}
