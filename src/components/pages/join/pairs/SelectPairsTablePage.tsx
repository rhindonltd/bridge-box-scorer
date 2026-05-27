"use client";

import { SectionInfo } from "@/components/common/SectionInfo";
import SelectPairsTable from "@/components/join/SelectPairsTable";
import { useGame } from "@/context/GameContext";
import { PairStartingPosition } from "@/db/games/pairs/queries/find-pair-starting-positions";
import { fetcher } from "@/lib/fetcher";
import { getSocket } from "@/lib/socket";
import { Seat } from "@/model/participants";
import { SocketEvents } from "@/socket/socket-events";
import { useEffect } from "react";
import useSWR, { useSWRConfig } from "swr";

interface Props {
  onSeatSelected: (seat: Seat) => void;
}

export function SelectPairsTablePage({ onSeatSelected }: Props) {
  const { gameSelection } = useGame();
  const { mutate } = useSWRConfig();

  const gameId = gameSelection?.gameId;

  const { data } = useSWR<PairStartingPosition[], Error>(
    gameId ? `/api/games/pairs/${gameId}/starting-positions` : null,
    fetcher,
  );

  if (!gameSelection) {
    return null;
  }

  useEffect(() => {
    if (!gameId) return;

    const socket = getSocket();

    const key = `/api/games/pairs/${gameId}/starting-positions`;

    function handleStartingPositions(payload: {
      startingPositions: PairStartingPosition[];
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
