"use client";

import SelectPairsTable from "@/components/join/pairs/SelectPairsTable";
import { useGame } from "@/context/GameContext";
import { useSocketSWRSync } from "@/hooks/socket-swr-sync";
import { fetcher } from "@/lib/fetcher";
import { SocketEvents } from "@/socket/socket-events";
import { swrKeys } from "@/swr/swr-keys";
import { useState } from "react";
import useSWR from "swr";
import { Pair, PairSeat, Seat } from "@/model/participants";
import { NewPlayer } from "@/db/games/shared/tables/players";
import EnterPairPlayerNames from "@/components/join/pairs/EnterPairPlayerNames";
import { GameInfo } from "@/components/common/GameInfo";
import { createParticipant } from "@/lib/game-service";

interface Props {
  onSeatSelected: (seat: Seat) => void;
}

export function SelectPairSeatPage({ onSeatSelected }: Props) {
  const { game } = useGame();
  const gameId = game?.gameId;

  const [selectedSeat, setSelectedSeat] = useState<PairSeat | null>(null);

  const key = gameId ? swrKeys.pairs(gameId) : null;

  const { data } = useSWR<Pair[], Error>(key, fetcher);

  if (!gameId) {
    return null;
  }

  useSocketSWRSync(
    SocketEvents.PARTICIPANTS,
    (p) => ({
      key: swrKeys.pairs(gameId),
      data: p.participants,
    }),
    [gameId],
  );

  const handleSeatSelected = (seat: PairSeat) => {
    setSelectedSeat(seat);
  };

  async function handlePairSubmitted(player1: NewPlayer, player2: NewPlayer) {
    await createParticipant(gameId!, {
      type: "PAIR",
      initialSeat: selectedSeat!,
      player1,
      player2,
    });
    // TODO: Put seat and key in local storage
  }

  return (
    <div className="min-h-dvh flex flex-col bg-gray-100">
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
