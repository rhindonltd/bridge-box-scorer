"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { HandoverChooser } from "@/app/game/[gameId]/play/[initialSeat]/handover/HandoverChooser";
import { HandoverPlayersPage } from "@/app/game/[gameId]/play/[initialSeat]/handover/HandoverPlayersPage";
import { HandoverDifferentDevicePage } from "@/app/game/[gameId]/play/[initialSeat]/handover/HandoverDifferentDevicePage";
import { useAssignment } from "@/context/AssignmentContext";
import { handoverSameDevice } from "@/lib/game-service";
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
