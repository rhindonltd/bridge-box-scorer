"use client";

import { GamePageLayout } from "@/components/layout/GamePageLayout";
import { ChangeDeviceView } from "@/app/game/[gameId]/play/[initialSeat]/ChangeDeviceView";

export interface ChangeDevicePageProps {
  gameId: string;
  /** The seat being moved (section-qualified, e.g. "A3NS"). */
  seat: string;
  /** Back to where the player came from (the waiting screen or play). */
  onBack: () => void;
}

/**
 * "Change device": the SAME pair moves this seat to another phone or tablet
 * (e.g. a flat battery). Shows a single-use transfer code with a countdown
 * (see {@link ChangeDeviceView}); once the other device claims it, this device
 * is signed out of the seat.
 *
 * A full page (like Handover and Withdraw) rather than a dialog, because it has
 * a real consequence — this device loses the seat. The header back arrow is
 * the way out; there is no separate Done/Cancel button.
 */
export function ChangeDevicePage({
  gameId,
  seat,
  onBack,
}: ChangeDevicePageProps) {
  return (
    <GamePageLayout
      headerTitle="Change device"
      // The code panel is a fixed-size block: centre it on the page.
      contentMode="center"
      backAction={onBack}
    >
      <div className="flex flex-col gap-5 px-6 py-6 max-w-sm w-full mx-auto">
        <ChangeDeviceView gameId={gameId} seat={seat} />
      </div>
    </GamePageLayout>
  );
}
