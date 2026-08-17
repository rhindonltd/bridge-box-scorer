"use client";

import { useGame } from "@/context/GameContext";
import { Pair, PairSeat, Seat } from "@/model/participants";
import { useState } from "react";
import EnterPlayerNames from "@/components/join/EnterPlayerNames";
import { swrKeys } from "@/swr/swr-keys";
import { fetcher } from "@/lib/fetcher";
import { useSocketSWRSync } from "@/hooks/socket-swr-sync";
import { SocketEvents } from "@/socket/socket-events";
import useSWR from "swr";
import { NewPlayer } from "@/db/games/tables/players";
import { createParticipant } from "@/lib/game-service";
import SelectPairsTable from "@/components/join/SelectTable";
import { GamePageLayout } from "@/components/layout/GamePageLayout";

interface Props {
  onSeatSelected: (seat: Seat) => void;
}

export function SelectSeatPage({ onSeatSelected }: Props) {
  const { game } = useGame();

  const gameId = game?.gameId;

  const [selectedSeat, setSelectedSeat] = useState<PairSeat | null>(null);

  const key = gameId ? swrKeys.pairs(gameId) : null;

  const { data } = useSWR<Pair[], Error>(key, fetcher);

  useSocketSWRSync(
    SocketEvents.PARTICIPANTS,
    (p) => ({
      key: swrKeys.pairs(gameId!),
      data: p.participants,
    }),
    [gameId],
  );

  if (!game || !gameId) {
    return null;
  }

  const handleSeatSelected = (seat: PairSeat) => {
    setSelectedSeat(seat);
  };

  async function handlePairSubmitted(player1: NewPlayer, player2: NewPlayer) {
    await createParticipant(gameId!, {
      type: "PAIR",
      initialSeat: selectedSeat!,
      player1,
      player2,
    }).then(() => onSeatSelected(selectedSeat!));
  }

  return (
    <GamePageLayout
      headerTitle="Select Seat"
      children={
        <>
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
              <EnterPlayerNames
                seat={selectedSeat}
                onSubmitPair={handlePairSubmitted}
              />
            )}
          </div>
        </>
      }
    />
  );
}
