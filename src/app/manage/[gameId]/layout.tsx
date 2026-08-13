import { GameProviderClient } from "@/context/GameProviderClient";
import { DirectorGuard } from "@/components/manage/DirectorGuard";

export default async function GameLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;

  return (
    <GameProviderClient gameId={gameId}>
      <DirectorGuard gameId={gameId}>{children}</DirectorGuard>
    </GameProviderClient>
  );
}
