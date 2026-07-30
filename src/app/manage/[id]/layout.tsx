import { GameProviderClient } from "@/context/GameProviderClient";
import { DirectorGuard } from "@/components/manage/DirectorGuard";

export default async function GameLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <GameProviderClient gameId={id}>
      <DirectorGuard gameId={id}>{children}</DirectorGuard>
    </GameProviderClient>
  );
}
