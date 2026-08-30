import { DirectorGuard } from "@/app/game/[gameId]/manage/DirectorGuard";

export default async function GameLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;

  return <DirectorGuard gameId={gameId}>{children}</DirectorGuard>;
}
