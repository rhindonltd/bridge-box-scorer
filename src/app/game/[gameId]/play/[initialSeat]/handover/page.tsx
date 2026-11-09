"use client";

import { useCallback, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { HandoverChooser } from "@/app/game/[gameId]/play/[initialSeat]/handover/HandoverChooser";
import { HandoverPlayersPage } from "@/app/game/[gameId]/play/[initialSeat]/handover/HandoverPlayersPage";
import { HandoverDifferentDevicePage } from "@/app/game/[gameId]/play/[initialSeat]/handover/HandoverDifferentDevicePage";
import { useAssignment } from "@/context/AssignmentContext";
import { handoverSameDevice } from "@/lib/game-service";
import { SeatTakenOverPage } from "@/app/game/[gameId]/play/[initialSeat]/SeatTakenOverPage";
import { useSocketEvent } from "@/hooks/socket-event";
import { SocketEvents } from "@/socket/socket-events";
import type { SocketEventMap } from "@/socket/socket-event-map";
import type { NewPlayer } from "@/db/games/tables/players";

type Step = "choose" | "same" | "different";

/**
 * Handover screen: an arriving pair takes over this seat mid-game (a latecomer,
 * a substitute for a withdrawing pair, …). Available for any seated seat — the
 * standing/treatment of either pair is decided later by the director on the
 * Substitutions screen, not a precondition here.
 *
 * Step 1 (choose): same device or different device.
 *  - Same device: the arriving pair enters their names here; on success this
 *    device stores the new secret and keeps playing as them.
 *  - Different device: this device mints a HANDOVER code for the arriving pair
 *    to claim on their own device, after which this device is signed out.
 *
 * If the seat has no pair at all (e.g. the page was opened directly on an empty
 * seat), bounce back to play — the server would reject it anyway.
 */
export default function HandoverRoute() {
  const params = useParams<{ gameId: string; initialSeat: string }>();
  const router = useRouter();
  const { gameId, initialSeat: seat } = params;
  const { pair, isLoading } = useAssignment();

  const [step, setStep] = useState<Step>("choose");

  const playHref = `/game/${gameId}/play/${seat}`;

  // Different-device handover: once the arriving pair claims this device's
  // code the server signs this device out of the seat and says so. Switch to
  // the "seat moved" screen (as the play screen does) rather than leaving the
  // old code on show.
  const [takenOver, setTakenOver] = useState(false);
  const onSeatTakenOver = useCallback(
    (payload: SocketEventMap[typeof SocketEvents.SEAT_TAKEN_OVER]) => {
      if (payload.gameId === gameId && payload.seat === seat) {
        setTakenOver(true);
      }
    },
    [gameId, seat],
  );
  useSocketEvent(SocketEvents.SEAT_TAKEN_OVER, onSeatTakenOver, [
    onSeatTakenOver,
  ]);

  if (takenOver) {
    return <SeatTakenOverPage />;
  }

  // Defence in depth: a handover needs a pair to hand over FROM. Wait for the
  // pair list to load before deciding (null during load), then bounce the
  // direct-URL-on-an-empty-seat case.
  if (!isLoading && pair == null) {
    router.replace(playHref);
    return null;
  }

  async function onSameDeviceSubmit(player1: NewPlayer, player2: NewPlayer) {
    await handoverSameDevice(gameId, seat, { player1, player2 });
    router.replace(playHref);
  }

  if (step === "same") {
    return (
      <HandoverPlayersPage
        onCancel={() => setStep("choose")}
        onSubmit={onSameDeviceSubmit}
      />
    );
  }

  if (step === "different") {
    return (
      <HandoverDifferentDevicePage
        gameId={gameId}
        seat={seat}
        onBack={() => setStep("choose")}
      />
    );
  }

  return (
    <HandoverChooser
      onCancel={() => router.replace(playHref)}
      onSameDevice={() => setStep("same")}
      onDifferentDevice={() => setStep("different")}
    />
  );
}
