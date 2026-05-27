"use client";

import { SectionInfo } from "@/components/common/SectionInfo";
import SelectPairsTable from "@/components/join/SelectPairsTable";
import { useGame } from "@/context/GameContext";
import { PairInitialSeat } from "@/db/games/pairs/queries/find-pair-initial-seats";
import { fetcher } from "@/lib/fetcher";
import { getSocket } from "@/lib/socket";
import { Seat } from "@/model/participants";
import { SocketEvents } from "@/socket/socket-events";
import { useEffect } from "react";
import useSWR, { useSWRConfig } from "swr";

interface Props {
  onSeatSelected: (seat: Seat) => void;
}

export function SelectPairSeatPage({ onSeatSelected }: Props) {
  const { gameSelection } = useGame();
  const { mutate } = useSWRConfig();

  const gameId = gameSelection?.gameId;

  const { data } = useSWR<PairInitialSeat[], Error>(
    gameId ? `/api/games/pairs/${gameId}/initial-seat` : null,
    fetcher,
  );

  if (!gameSelection) {
    return null;
  }

  useEffect(() => {
    if (!gameId) return;

    const socket = getSocket();

    const key = `/api/games/pairs/${gameId}/initial-seat`;

    function handleStartingPositions(payload: {
      startingPositions: PairInitialSeat[];
    }) {
      mutate(key, payload.startingPositions, false);
    }

    socket.on(SocketEvents.STARTING_POSITIONS, handleStartingPositions);

    return () => {
      socket.off(SocketEvents.STARTING_POSITIONS, handleStartingPositions);
    };
  }, [gameId, mutate]);

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <div className="w-full">
        <SectionInfo />
      </div>

      <SelectPairsTable
        tables={gameSelection.tables}
        onSeatSelected={onSeatSelected}
        startingPositions={data ?? []}
      />
    </div>
  );
}
