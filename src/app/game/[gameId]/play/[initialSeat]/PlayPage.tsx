"use client";

import { useParams } from "next/navigation";
import { useRequiredGame } from "@/context/GameContext";
import { usePlayFlow } from "@/hooks/play-flow";
import { Seat } from "@/model/participants";
import { FullScreenSpinner } from "@/components/common/Spinner";
import { WaitingToStartPage } from "@/app/game/[gameId]/play/[initialSeat]/WaitingToStartPage";
import { PlayStateRouter } from "@/app/game/[gameId]/play/[initialSeat]/PlayStateRouter";

/**
 * Live play container for a seated player. Resolves the seat and game, drives
 * the play-flow state machine, and handles the two pre-play states (waiting for
 * the director to start, and the brief schedule-loading gap) before delegating
 * the per-state screen rendering to {@link PlayStateRouter}.
 */
export function PlayPage() {
  const params = useParams<{ initialSeat: string }>();
  const seat = params.initialSeat;

  const { game } = useRequiredGame();
  const flow = usePlayFlow(
    game.gameId,
    seat,
    game.handEntryEnabled,
    // A teams game shows the post-round "team results" summary.
    game.gameType === "TEAMS",
  );

  // Seated, but the director hasn't started the game yet: show a friendly
  // waiting screen (it revalidates and advances automatically at start) rather
  // than an indefinite spinner.
  if (flow.waitingToStart) {
    return <WaitingToStartPage gameId={game.gameId} seat={seat as Seat} />;
  }

  if (!flow.schedule) {
    return <FullScreenSpinner />;
  }

  return (
    <PlayStateRouter
      schedule={flow.schedule}
      playState={flow.playState}
      gameId={game.gameId}
      seat={seat}
      gameType={game.gameType}
      scoringType={game.scoringType}
      leadCardRequired={game.leadCardRequired}
      handlers={flow}
    />
  );
}
