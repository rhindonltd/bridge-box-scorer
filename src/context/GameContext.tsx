"use client";

import { Game } from "@/model/common";
import { Assignment } from "@/model/participants";
import { createContext, useContext, useState, ReactNode } from "react";

export type GameSelection = Game | null;

export type AssignmentSelection = Assignment | null;

interface ContextType {
  gameSelection: GameSelection;
  selectGame: (game: Game) => void;
  clearGame: () => void;

  assignmentSelection: AssignmentSelection;
  selectAssignment: (assignment: Assignment) => void;
  clearAssignment: () => void;
}

export const GameContext = createContext<ContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [gameSelection, setGameSelection] = useState<GameSelection>(null);
  const [assignmentSelection, setAssignmentSelection] =
    useState<AssignmentSelection>(null);

  const selectGame = (game: Game) => {
    setGameSelection(game);
  };

  const selectAssignment = (assignment: Assignment) => {
    setAssignmentSelection(assignment);
  };

  const clearGame = () => setGameSelection(null);

  const clearAssignment = () => setAssignmentSelection(null);

  return (
    <GameContext.Provider
      value={{
        gameSelection,
        selectGame,
        clearGame,
        assignmentSelection,
        selectAssignment,
        clearAssignment,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
