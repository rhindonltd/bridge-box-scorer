import { notFound } from "next/navigation";
import { GameProvider } from "@/context/GameContext";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import GameGate from "./GameGate";

export default async function GameLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;

  const game = await findGameById(gameId);

  if (!game) {
    notFound();
  }

  return (
    <GameProvider initialGame={game}>
      <GameGate>{children}</GameGate>
    </GameProvider>
  );
}
