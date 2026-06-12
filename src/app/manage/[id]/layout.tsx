import { GameProviderClient } from "@/context/GameProviderClient";

export default async function GameLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <GameProviderClient gameId={id}>{children}</GameProviderClient>;
}
