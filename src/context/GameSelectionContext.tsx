"use client";

import { Game } from "@/model/common";
import { createContext, useContext, useState, ReactNode } from "react";

type Selection = Game | null;

interface ContextType {
  selection: Selection;
  selectGame: (game: Game) => void;
  clearSelection: () => void;
}

export const GameContext = createContext<ContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [selection, setSelection] = useState<Selection>(null);

  const selectGame = (game: Game) => {
    setSelection(game);
  };

  const clearSelection = () => setSelection(null);

  return (
    <GameContext.Provider value={{ selection, selectGame, clearSelection }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
