"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useGame } from "@/context/GameContext";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { getSocket } from "@/lib/socket";
import { SocketEvents } from "@/socket/socket-events";
import { swrKeys } from "@/swr/swr-keys";
import { TableRoundStatus } from "@/lib/round-status";
import { RoundStatusView } from "@/components/pages/manage/RoundStatusView";

interface RoundStatusResponse {
  tables: TableRoundStatus[];
}

export default function RoundStatusPage() {
  const params = useParams<{ id: string }>();
  const gameId = params.id;
  const { game } = useGame();

  const key = swrKeys.roundStatus(gameId);
  const { data, isLoading, mutate } = useSWR<RoundStatusResponse>(key, fetcher);

  // Listen for BOARD_RESULT_UPDATED events and revalidate SWR cache
  useEffect(() => {
    const socket = getSocket();

    const onBoardResultUpdated = () => {
      mutate();
    };

    socket.on(SocketEvents.BOARD_RESULT_UPDATED, onBoardResultUpdated);

    return () => {
      socket.off(SocketEvents.BOARD_RESULT_UPDATED, onBoardResultUpdated);
    };
  }, [mutate]);

  if (!game) return null;

  return (
    <RoundStatusView
      eventName={game.eventName}
      tables={data?.tables ?? []}
      isLoading={isLoading}
    />
  );
}
