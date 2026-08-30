"use client";

import { createContext, useContext, ReactNode, useEffect } from "react";

import useSWR, { KeyedMutator } from "swr";
import { BridgeGame } from "@/db/game-index/schema";
import { getSocket } from "@/lib/socket";
import { SocketEvents } from "@/socket/socket-events";
import { swrKeys } from "@/swr/swr-keys";
import { fetcher } from "@/lib/fetcher";

interface ContextType {
  game: BridgeGame | null;
  isLoading: boolean;
  mutateGame: KeyedMutator<BridgeGame>;
}

export const GameContext = createContext<ContextType | undefined>(undefined);

export function GameProvider({
  children,
  gameId,
}: {
  children: ReactNode;
  gameId: string | null;
}) {
  const socket = getSocket();

  const key = gameId ? swrKeys.game(gameId) : null;

  const { data: game, isLoading, mutate } = useSWR<BridgeGame>(key, fetcher);

  useEffect(() => {
    if (!gameId) return;

    socket.emit(SocketEvents.JOIN_GAME, { gameId });

    const handleReconnect = () => {
      socket.emit(SocketEvents.JOIN_GAME, { gameId });
    };

    const handleGameUpdated = (payload: { game: BridgeGame }) => {
      mutate(payload.game, false);
    };

    socket.on(SocketEvents.CONNECT, handleReconnect);
    socket.on(SocketEvents.GAME_UPDATED, handleGameUpdated);

    return () => {
      socket.emit(SocketEvents.LEAVE_GAME, { gameId });
      socket.off(SocketEvents.CONNECT, handleReconnect);
      socket.off(SocketEvents.GAME_UPDATED, handleGameUpdated);
    };
  }, [gameId]);

  return (
    <GameContext.Provider
      value={{
        game: game ?? null,
        isLoading,
        mutateGame: mutate,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() : ContextType {
  const ctx = useContext(GameContext);

  if (!ctx) {
    throw new Error("useGame must be used within GameProvider");
  }

  return ctx;
}

export function useRequiredGame(): {
    game: BridgeGame;
    mutateGame: KeyedMutator<BridgeGame>;
} {
  const { game, isLoading, mutateGame } = useGame();

  if (isLoading || !game) {
    throw new Error("Game is not available");
  }

  return { game, mutateGame };
}
