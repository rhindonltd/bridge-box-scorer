"use client";

import { SectionInfo } from "@/components/common/SectionInfo";
import SelectIndividualTable from "@/components/join/SelectIndividualTable";
import { useGame } from "@/context/GameContext";
import { PlayerInitialSeat } from "@/db/games/shared/queries/find-player-initial-seats";
import { fetcher } from "@/lib/fetcher";
import { getSocket } from "@/lib/socket";
import { Seat } from "@/model/participants";
import { SocketEvents } from "@/socket/socket-events";
import { useEffect } from "react";
import useSWR, { useSWRConfig } from "swr";

interface Props {
  onSeatSelected: (seat: Seat) => void;
}

export function SelectIndividualSeatPage({ onSeatSelected }: Props) {
  const { gameSelection } = useGame();
  const { mutate } = useSWRConfig();

  const gameId = gameSelection?.gameId;

  const { data } = useSWR<PlayerInitialSeat[], Error>(
    gameId ? `/api/games/individual/${gameId}/initial-seat` : null,
    fetcher,
  );

  if (!gameSelection) {
    return null;
  }

  useEffect(() => {
    if (!gameId) return;

    const socket = getSocket();

    const key = `/api/games/individual/${gameId}/initial-seat`;

    function handleStartingPositions(payload: {
      startingPositions: PlayerInitialSeat[];
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

      <SelectIndividualTable
        onSeatSelected={onSeatSelected}
        tables={gameSelection.tables}
        startingPositions={data ?? []}
      />
    </div>
  );
}
