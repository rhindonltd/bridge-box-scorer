"use client";

import { GamePageLayout } from "@/components/layout/GamePageLayout";
import { ChangeDeviceView } from "@/app/game/[gameId]/play/[initialSeat]/ChangeDeviceView";

export interface HandoverDifferentDevicePageProps {
  gameId: string;
  /** The seat being handed over (section-qualified, e.g. "A3NS"). */
  seat: string;
  /** Back to the handover chooser. */
  onBack: () => void;
}

/**
 * Different-device handover: mint a HANDOVER transfer code for the arriving
 * pair to claim on their own device. Reuses {@link ChangeDeviceView} (with
 * `kind="HANDOVER"`), which shows the code + countdown; the arriving device
 * claims it from the join screen and enters their names, after which THIS
 * device is signed out of the seat.
 */
export function HandoverDifferentDevicePage({
  gameId,
  seat,
  onBack,
}: HandoverDifferentDevicePageProps) {
  return (
    <GamePageLayout
      headerTitle="Handover"
      // The code panel is a fixed-size block: centre it on the page.
      contentMode="center"
      backAction={onBack}
    >
      <div className="flex flex-col gap-5 px-6 py-6 max-w-sm w-full mx-auto">
        <ChangeDeviceView gameId={gameId} seat={seat} kind="HANDOVER" />
      </div>
    </GamePageLayout>
  );
}
