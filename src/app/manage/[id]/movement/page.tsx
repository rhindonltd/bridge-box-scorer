"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useGame } from "@/context/GameContext";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { getSocket } from "@/lib/socket";
import { SocketEvents } from "@/socket/socket-events";
import {
  MovementDetailView,
  MovementTableData,
} from "@/components/movement/MovementDetailView";

interface MovementResponse {
  type: string;
  tables: MovementTableData[];
}

export default function MovementPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const gameId = params.id;
  const { game } = useGame();

  const { data, isLoading, mutate } = useSWR<MovementResponse>(
    `/api/games/${gameId}/movement`,
    fetcher,
  );

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

  if (isLoading || !data) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-white">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (data.tables.length === 0) {
    return (
      <div className="min-h-dvh flex flex-col bg-white">
        <div className="bg-gray-200 text-gray-800 py-3 text-center font-bold text-lg shrink-0">
          {game.eventName}
        </div>
        <div className="bg-blue-600 text-white px-3 py-2.5 text-center font-bold text-lg">
          Movement
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500 text-base">No movement set up yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-dvh flex flex-col">
      <MovementDetailView
        movementName={game.eventName}
        movementType={data.type}
        tables={data.tables}
        onBack={() => router.replace(`/manage/${gameId}/menu`)}
      />
    </div>
  );
}
