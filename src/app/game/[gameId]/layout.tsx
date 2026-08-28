'use client';

import Loading from "@/app/loading";
import { GameProvider, useGame } from "@/context/GameContext";
import { notFound } from "next/navigation";

export default async function GameLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;

  return <GameProvider gameId={gameId}>
      <GameComponent children={children} />
  </GameProvider>;
}

function GameComponent({ children }: { children: React.ReactNode }) {
    const {game, isLoading} = useGame();

    if (isLoading) {
        return <Loading/>
    } else if (!game) {
        return notFound();
    }

    return children;
}
