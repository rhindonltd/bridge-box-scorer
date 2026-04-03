"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type Selection = {
  round: number;
} | null;

interface ContextType {
  selection: Selection;
  selectRound: (round: number) => void;
  clearSelection: () => void;
}

const RoundContext = createContext<ContextType | undefined>(undefined);

export function RoundProvider({ children }: { children: ReactNode }) {
  const [selection, setSelection] = useState<Selection>(null);

  const selectRound = (round: number) => {
    setSelection({ round });
  };

  const clearSelection = () => setSelection(null);

  return (
    <RoundContext.Provider value={{ selection, selectRound, clearSelection }}>
      {children}
    </RoundContext.Provider>
  );
}

export function useRound() {
  const ctx = useContext(RoundContext);
  if (!ctx) throw new Error("useRound must be used within EventProvider");
  return ctx;
}
