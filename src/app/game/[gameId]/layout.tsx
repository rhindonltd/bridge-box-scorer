import { GameProvider } from "@/context/GameContext";
import GameGate from "./GameGate";

export default async function GameLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;

  return (
    <GameProvider gameId={gameId}>
      <GameGate>{children}</GameGate>
    </GameProvider>
  );
}
