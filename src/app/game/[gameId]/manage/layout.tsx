import { DirectorGuard } from "@/app/game/[gameId]/manage/DirectorGuard";
import { NotFinalisedGuard } from "@/app/game/[gameId]/manage/StateGuards";

export default async function GameLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;

  return (
    <DirectorGuard gameId={gameId}>
      <NotFinalisedGuard gameId={gameId}>{children}</NotFinalisedGuard>
    </DirectorGuard>
  );
}
