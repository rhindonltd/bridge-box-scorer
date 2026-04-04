"use client";

import { GameProvider } from "@/context/GameSelectionContext";

export default function GameLayout({ children }: {
    children: React.ReactNode;
}) {
    return <GameProvider>{children}</GameProvider>;
}
