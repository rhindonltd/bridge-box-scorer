"use client";

import { SectionInfo } from "@/components/common/SectionInfo";
import SelectIndividualTable from "@/components/join/SelectIndividualTable";
import { useGame } from "@/context/GameContext";
import { PlayerInitialSeat } from "@/db/games/shared/queries/find-player-initial-seats";
import { useSocketSWRSync } from "@/hooks/socket-swr-sync";
import { fetcher } from "@/lib/fetcher";
import { Seat } from "@/model/participants";
import { SocketEvents } from "@/socket/socket-events";
import { swrKeys } from "@/swr/swr-keys";
import useSWR from "swr";

interface Props {
  onSeatSelected: (seat: Seat) => void;
}

export function SelectIndividualSeatPage({ onSeatSelected }: Props) {
  const { game } = useGame();

  const gameId = game?.gameId;

  const key = gameId ? swrKeys.individualInitialSeats(gameId) : null;

  const { data } = useSWR<PlayerInitialSeat[], Error>(key, fetcher);

  if (!gameId) {
    return null;
  }

  useSocketSWRSync(
    SocketEvents.STARTING_POSITIONS,
    (p) => ({
      key: swrKeys.individualInitialSeats(gameId),
      data: p.startingPositions,
    }),
    [gameId],
  );

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <div className="w-full">
        <SectionInfo />
      </div>

      <SelectIndividualTable
        onSeatSelected={onSeatSelected}
        tables={game.tables}
        startingPositions={data ?? []}
      />
    </div>
  );
}
