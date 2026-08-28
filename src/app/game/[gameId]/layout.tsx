import { GameProviderClient } from "@/context/GameProviderClient";

export default async function GameLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;

  return <GameProviderClient gameId={gameId}>{children}</GameProviderClient>;
}
