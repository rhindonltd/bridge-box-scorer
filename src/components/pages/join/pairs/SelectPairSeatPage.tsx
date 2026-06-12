"use client";

import { SectionInfo } from "@/components/common/SectionInfo";
import SelectPairsTable from "@/components/join/SelectPairsTable";
import { useGame } from "@/context/GameContext";
import { PairInitialSeat } from "@/db/games/pairs/queries/find-pair-initial-seats";
import { useSocketSWRSync } from "@/hooks/socket-swr-sync";
import { fetcher } from "@/lib/fetcher";
import { Seat } from "@/model/participants";
import { SocketEvents } from "@/socket/socket-events";
import { swrKeys } from "@/swr/swr-keys";
import useSWR from "swr";

interface Props {
  onSeatSelected: (seat: Seat) => void;
}

export function SelectPairSeatPage({ onSeatSelected }: Props) {
  const { game } = useGame();

  const gameId = game?.gameId;

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

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <div className="w-full">
        <SectionInfo />
      </div>

      <SelectPairsTable
        tables={game.tables}
        onSeatSelected={onSeatSelected}
        startingPositions={data ?? []}
      />
    </div>
  );
}
