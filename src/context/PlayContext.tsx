"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type BoardSelection = {
    board: number;
} | null;

type RoundSelection = {
    round: number;
} | null;

interface ContextType {
    boardSelection: BoardSelection;
    selectBoard: (board: number) => void;
    clearBoard: () => void;

    roundSelection: RoundSelection;
    selectRound: (round: number) => void;
    clearRound: () => void;
}

export const PlayContext = createContext<ContextType | undefined>(undefined);

export function PlayProvider({ children }: { children: ReactNode }) {
    const [boardSelection, setBoardSelection] = useState<BoardSelection>(null);
    const [roundSelection, setRoundSelection] = useState<RoundSelection>(null);

    const selectBoard = (board: number) => {
        setBoardSelection({ board });
    };

    const selectRound = (round: number) => {
        setRoundSelection({ round });
    };

    const clearBoard = () => setBoardSelection(null);

    const clearRound = () => setRoundSelection(null);

    return (
        <PlayContext.Provider value={{ boardSelection, selectBoard, clearBoard, roundSelection, selectRound, clearRound }}>
            {children}
        </PlayContext.Provider>
    );
}

export function usePlay() {
    const ctx = useContext(PlayContext);
    if (!ctx) throw new Error("usePlay must be used within PlayProvider");
    return ctx;
}
