"use client";

import { BridgeGame } from "@/db/game-index/schema";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

import { getSocket } from "@/lib/socket";
import { SocketEvents } from "@/socket/socket-events";

export type GameSelection = BridgeGame | null;

interface ContextType {
  gameSelection: GameSelection;
  selectGame: (game: BridgeGame) => void;
  clearGame: () => void;
}

export const GameContext = createContext<ContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [gameSelection, setGameSelection] = useState<GameSelection>(null);

  useEffect(() => {
    const socket = getSocket();

    const gameId = gameSelection?.gameId;

    if (!gameId) return;

    socket.emit(
      SocketEvents.JOIN_GAME,
      { gameId },
      (response: { success: boolean; error?: string }) => {
        if (!response.success) {
          console.error(response.error);
        }
      },
    );

    function handleReconnect() {
      socket.emit(SocketEvents.JOIN_GAME, { gameId });
    }

    socket.on(SocketEvents.CONNECT, handleReconnect);

    return () => {
      socket.emit("game:leave", { gameId });
      socket.off(SocketEvents.CONNECT, handleReconnect);
    };
  }, [gameSelection]);

  const selectGame = (game: BridgeGame) => {
    setGameSelection(game);
  };

  const clearGame = () => setGameSelection(null);

  return (
    <GameContext.Provider
      value={{
        gameSelection,
        selectGame,
        clearGame,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);

  if (!ctx) {
    throw new Error("useGame must be used within GameProvider");
  }

  return ctx;
}
