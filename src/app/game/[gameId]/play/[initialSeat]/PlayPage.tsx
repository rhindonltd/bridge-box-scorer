"use client";

import { useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useRequiredGame } from "@/context/GameContext";
import { usePlayFlow } from "@/hooks/play-flow";
import { Seat } from "@/model/participants";
import { FullScreenSpinner } from "@/components/common/Spinner";
import { WaitingToStartPage } from "@/app/game/[gameId]/play/[initialSeat]/WaitingToStartPage";
import { SeatTakenOverPage } from "@/app/game/[gameId]/play/[initialSeat]/SeatTakenOverPage";
import { PlayStateRouter } from "@/app/game/[gameId]/play/[initialSeat]/PlayStateRouter";
import { useSocketEvent } from "@/hooks/socket-event";
import { useSeatTakenOver } from "@/hooks/seat-taken-over";
import { SocketEvents } from "@/socket/socket-events";
import type { SocketEventMap } from "@/socket/socket-event-map";
import { getPlayerToken, setPlayerToken } from "@/lib/player-token";

/**
 * Live play container for a seated player. Resolves the seat and game, drives
 * the play-flow state machine, and handles the two pre-play states (waiting for
 * the director to start, and the brief schedule-loading gap) before delegating
 * the per-state screen rendering to {@link PlayStateRouter}.
 */
export function PlayPage() {
  const params = useParams<{ initialSeat: string }>();
  const seat = params.initialSeat;
  const router = useRouter();

  const { game } = useRequiredGame();
  const flow = usePlayFlow(
    game.gameId,
    seat,
    game.handEntryEnabled,
    // A teams game shows the post-round "team results" summary.
    game.gameType === "TEAMS",
  );

  // When another device takes this seat (a "change device" claim, a handover,
  // or the director moving the pair), the server signs this device out. Switch
  // to the "seat moved" screen so the user isn't left on a play screen they no
  // longer control. Also detected on reconnect, for a device that was offline.
  const takenOver = useSeatTakenOver(game.gameId, seat);

  // A director splitting a section renumbers seats (e.g. this device's A5NS
  // becomes B1NS). The server pushes every old→new move to the game room; if
  // THIS device's seat moved, adopt the new seat: rewrite the stored player
  // token's position (the auth secret is unchanged) and re-route to the new
  // play URL so every seat-keyed read (play state, pair, submissions) lines up
  // with the DB again. Without this the device would be stranded on a seat that
  // no longer exists.
  const onSeatRenumbered = useCallback(
    (payload: SocketEventMap[typeof SocketEvents.SEAT_RENUMBERED]) => {
      if (payload.gameId !== game.gameId) return;
      const move = payload.moves.find((m) => m.from === seat);
      if (!move) return;

      const stored = getPlayerToken(game.gameId);
      if (stored) {
        setPlayerToken(game.gameId, {
          ...stored,
          startingPosition: move.to,
        });
      }
      router.replace(`/game/${game.gameId}/play/${move.to}`);
    },
    [game.gameId, seat, router],
  );
  useSocketEvent(SocketEvents.SEAT_RENUMBERED, onSeatRenumbered, [
    onSeatRenumbered,
  ]);

  if (takenOver) {
    return <SeatTakenOverPage />;
  }

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
