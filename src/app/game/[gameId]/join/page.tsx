import { redirect } from "next/navigation";
import { isGameCompleted } from "@/db/game-index/queries/is-game-completed";
import JoinGameAsPlayer from "@/app/game/[gameId]/join/JoinGameAsPlayer";

export default async function JoinGameAsPlayerRoute({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;

  // A completed game has nothing left to join, so anyone arriving at the join
  // URL directly is sent to that game's leaderboard instead.
  if (await isGameCompleted(gameId)) {
    redirect(`/game/${gameId}/display/leaderboard`);
  }

  return <JoinGameAsPlayer />;
}
