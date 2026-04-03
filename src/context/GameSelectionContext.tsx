"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type Selection = {
  eventName: string;
  sessionName: string;
  sectionName: string;
} | null;

interface ContextType {
  selection: Selection;
  selectGame: (
    eventName: string,
    sessionName: string,
    sectionName: string,
  ) => void;
  clearSelection: () => void;
}

export const GameContext = createContext<ContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [selection, setSelection] = useState<Selection>(null);

  const selectGame = (
    eventName: string,
    sessionName: string,
    sectionName: string,
  ) => {
    setSelection({ eventName, sessionName, sectionName });
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
