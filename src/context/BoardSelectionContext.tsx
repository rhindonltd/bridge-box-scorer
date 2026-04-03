"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type Selection = {
  board: number;
} | null;

interface ContextType {
  selection: Selection;
  selectBoard: (board: number) => void;
  clearSelection: () => void;
}

const BoardContext = createContext<ContextType | undefined>(undefined);

export function BoardProvider({ children }: { children: ReactNode }) {
  const [selection, setSelection] = useState<Selection>(null);

  const selectBoard = (board: number) => {
    setSelection({ board });
  };

  const clearSelection = () => setSelection(null);

  return (
    <BoardContext.Provider value={{ selection, selectBoard, clearSelection }}>
      {children}
    </BoardContext.Provider>
  );
}

export function useBoard() {
  const ctx = useContext(BoardContext);
  if (!ctx) throw new Error("useBoard must be used within EventProvider");
  return ctx;
}
