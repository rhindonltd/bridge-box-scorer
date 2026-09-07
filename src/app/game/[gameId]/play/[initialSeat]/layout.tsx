import { redirect } from "next/navigation";
import { AssignmentProvider } from "@/context/AssignmentContext";
import { isGameCompleted } from "@/db/game-index/queries/is-game-completed";
import { Seat } from "@/model/participants";

export default async function ParticipantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ gameId: string; initialSeat: string }>;
}) {
  const { gameId, initialSeat } = await params;

  // A completed game has nothing left to play, so anyone arriving at a play
  // URL directly is sent to that game's leaderboard instead.
  if (await isGameCompleted(gameId)) {
    redirect(`/game/${gameId}/display/leaderboard`);
  }

  return (
    <AssignmentProvider gameId={gameId} initialSeat={initialSeat as Seat}>
      {children}
    </AssignmentProvider>
  );
}
