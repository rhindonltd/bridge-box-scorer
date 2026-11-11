"use client";

import { useParams, useRouter } from "next/navigation";
import { ChangeDevicePage } from "@/app/game/[gameId]/play/[initialSeat]/change-device/ChangeDevicePage";
import { SeatTakenOverPage } from "@/app/game/[gameId]/play/[initialSeat]/SeatTakenOverPage";
import { useSeatTakenOver } from "@/hooks/seat-taken-over";
import {
  useSeatEvictedRedirect,
  useSeatRenumberedRedirect,
} from "@/hooks/seat-redirects";

/**
 * Change-device route: available any time — before the game starts (from the
 * waiting screen) and during play (from the play menu). Going back returns to
 * the play URL, which shows the waiting screen or the current play state.
 *
 * When the other device claims the code, the server signs THIS device out of
 * the seat. Switch to the "seat moved" screen (as the play screen does) rather
 * than leaving a used code on show.
 */
export default function ChangeDeviceRoute() {
  const params = useParams<{ gameId: string; initialSeat: string }>();
  const router = useRouter();
  const { gameId, initialSeat: seat } = params;

  const takenOver = useSeatTakenOver(gameId, seat);
  // This page is reachable before the start (from the waiting screen), so it
  // must react to the same pre-start seat changes the play page does: a section
  // split renumbering the seat, or the director evicting the pair.
  useSeatRenumberedRedirect(gameId, seat);
  useSeatEvictedRedirect(gameId, seat);

  if (takenOver) {
    return <SeatTakenOverPage />;
  }

  return (
    <ChangeDevicePage
      gameId={gameId}
      seat={seat}
      onBack={() => router.replace(`/game/${gameId}/play/${seat}`)}
    />
  );
}
