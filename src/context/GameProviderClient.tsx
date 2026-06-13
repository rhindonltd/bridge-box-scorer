"use client";

import { GameProvider } from "@/context/GameContext";

export function GameProviderClient({
  gameId,
  children,
}: {
  gameId: string;
  children: React.ReactNode;
}) {
  return <GameProvider gameId={gameId}>{children}</GameProvider>;
}
