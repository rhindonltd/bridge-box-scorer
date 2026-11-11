"use client";

import { GamePageLayout } from "@/components/layout/GamePageLayout";

export interface HandoverChooserProps {
  /** Back to play. */
  onCancel: () => void;
  /** The arriving pair is on THIS device (enter their names here). */
  onSameDevice: () => void;
  /** The arriving pair has their OWN device (mint a code for them to claim). */
  onDifferentDevice: () => void;
}

/**
 * The first step of a handover: choose whether the arriving pair is taking over
 * THIS device (same device — enter their names here and this device keeps
 * playing as them) or has their OWN device (different device — this device mints
 * a code the arriving pair claims, then this device is signed out).
 *
 * Available for any seat mid-game — a latecomer replacing a stand-in, a
 * substitute for a withdrawing pair, and so on. How each pair is scored is a
 * later director decision on the Substitutions screen, not set here.
 */
export function HandoverChooser({
  onCancel,
  onSameDevice,
  onDifferentDevice,
}: HandoverChooserProps) {
  return (
    <GamePageLayout
      headerTitle="Handover"
      // A short question and two choices: centre them on the page.
      contentMode="center"
      backAction={onCancel}
    >
      <div className="flex flex-col gap-5 px-6 py-6 max-w-sm w-full mx-auto">
        <p className="text-sm text-gray-600 text-center">
          A new pair is taking over this seat. Where will they play?
        </p>

        <button
          type="button"
          onClick={onSameDevice}
          className="flex flex-col gap-1 rounded-xl border border-gray-300 bg-white px-5 py-4 text-left transition hover:bg-gray-50 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <span className="text-base font-semibold text-gray-900">
            Same device
          </span>
          <span className="text-sm text-gray-600">
            The new pair will use this device. Enter their names and carry on
            from the next board.
          </span>
        </button>

        <button
          type="button"
          onClick={onDifferentDevice}
          className="flex flex-col gap-1 rounded-xl border border-gray-300 bg-white px-5 py-4 text-left transition hover:bg-gray-50 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <span className="text-base font-semibold text-gray-900">
            Different device
          </span>
          <span className="text-sm text-gray-600">
            The new pair has their own phone or tablet. Show them a code to
            enter on it. This device will be signed out of the seat.
          </span>
        </button>
      </div>
    </GamePageLayout>
  );
}
