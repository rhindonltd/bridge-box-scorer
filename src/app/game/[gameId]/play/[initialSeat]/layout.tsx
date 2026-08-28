import { AssignmentProvider } from "@/context/AssignmentContext";
import { Seat } from "@/model/participants";

export default async function ParticipantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ gameId: string; initialSeat: string }>;
}) {
  const { gameId, initialSeat } = await params;

  return (
    <AssignmentProvider gameId={gameId} initialSeat={initialSeat as Seat}>
      {children}
    </AssignmentProvider>
  );
}
