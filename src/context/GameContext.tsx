"use client";

import { createContext, useContext, ReactNode, useEffect } from "react";

import useSWR, { KeyedMutator } from "swr";
import { BridgeGame } from "@/db/game-index/schema";
import { getSocket } from "@/lib/socket";
import { SocketEvents } from "@/socket/socket-events";
import { swrKeys } from "@/swr/swr-keys";
import { unwrapFetcher } from "@/lib/fetcher";
import { useSocketSWRSync } from "@/hooks/socket-swr-sync";

interface GameContextValue {
  game: BridgeGame | null;
  isLoading: boolean;
  mutateGame: KeyedMutator<BridgeGame>;
}

export const GameContext = createContext<GameContextValue | undefined>(
  undefined,
);

/**
 * Join the game room for the lifetime of the mount, re-joining on every socket
 * reconnect (a reconnecting client has been dropped from its rooms server-side)
 * and leaving on unmount. This is GameContext's own concern — room membership,
 * not cache sync — so it stays a small purpose-named hook rather than folding
 * into the shared `useSocketSWRSync` wiring.
 */
function useGameRoom(gameId: string): void {
  useEffect(() => {
    const socket = getSocket();
    const join = () => socket.emit(SocketEvents.JOIN_GAME, { gameId });

    join();
    socket.on(SocketEvents.CONNECT, join);

    return () => {
      socket.emit(SocketEvents.LEAVE_GAME, { gameId });
      socket.off(SocketEvents.CONNECT, join);
    };
  }, [gameId]);
}

export function GameProvider({
  children,
  initialGame,
}: {
  children: ReactNode;
  initialGame: BridgeGame;
}) {
  const gameId = initialGame.gameId;
  const key = swrKeys.game(gameId);

  const gameFetcher = unwrapFetcher<BridgeGame>("game");

  const { data: game, isLoading, mutate } = useSWR<BridgeGame>(key, gameFetcher, {
    fallbackData: initialGame,
    // The server layout already provides a fresh snapshot and Socket.IO pushes
    // live updates, so there is no need to refetch on mount.
    revalidateOnMount: false,
  });

  // Room membership (join / reconnect-join / leave).
  useGameRoom(gameId);

  // Live updates: merge each pushed game snapshot straight into the SWR cache
  // (no revalidation), the same shared socket→SWR wiring the other contexts use.
  useSocketSWRSync(
    SocketEvents.GAME_UPDATED,
    (payload) => ({ key, data: payload.game }),
    [key],
  );

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

export function useGame(): GameContextValue {
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
