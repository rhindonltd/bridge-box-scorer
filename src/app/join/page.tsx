"use client";

import SelectGamePage from "@/components/pages/join/SelectGamePage";
import { SelectTablePage } from "@/components/pages/join/SelectTablePage";
import { useGame } from "@/context/GameSelectionContext";

export default function JoinGame() {
    const { selection, selectGame } = useGame();

    return (
        <>
            {selection == null ? (
                <SelectGamePage
                    games={[
                        {
                            id: crypto.randomUUID(),
                            eventName: "Monday PM Pairs",
                            sessionName: "",
                            sectionName: "",
                        },
                    ]}
                    onGameSelected={selectGame}
                />
            ) : (
                <SelectTablePage
                    tables={4}
                    selectTable={() => {}}
                    assigned={[]}
                />
            )}
        </>
    );
}
