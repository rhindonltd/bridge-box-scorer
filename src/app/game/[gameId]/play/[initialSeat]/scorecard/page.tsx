"use client";

import { useParams, useRouter } from "next/navigation";
import { useRequiredGame } from "@/context/GameContext";
import { useSections } from "@/hooks/sections";
import { useSeatTakenOver } from "@/hooks/seat-taken-over";
import { SeatTakenOverPage } from "@/app/game/[gameId]/play/[initialSeat]/SeatTakenOverPage";
import { ScorecardPage } from "@/app/game/[gameId]/play/[initialSeat]/scorecard/ScorecardPage";
import { useScorecard } from "@/app/game/[gameId]/play/[initialSeat]/scorecard/useScorecard";

/**
 * Scorecard route: the pair's own results so far (pairs events), opened from
 * the play menu. Going back returns to the play screen.
 *
 * If another device takes this seat while the scorecard is open, switch to
 * the "seat moved" screen, as every other play screen does.
 */
export default function ScorecardRoute() {
  const params = useParams<{ gameId: string; initialSeat: string }>();
  const router = useRouter();
  const { gameId, initialSeat: seat } = params;
  const { game } = useRequiredGame();
  const { sections } = useSections(gameId);
  const { card, loading } = useScorecard(gameId, seat);
  const takenOver = useSeatTakenOver(gameId, seat);

  if (takenOver) {
    return <SeatTakenOverPage />;
  }

  // As on the Board Results screen: the section only means something when
  // results are combined across more than one section.
  const hideSection = !(sections.length > 1 && game.combinedRanking);

  return (
    <ScorecardPage
      card={card}
      loading={loading}
      hideSection={hideSection}
      onBack={() => router.replace(`/game/${gameId}/play/${seat}`)}
    />
  );
}
