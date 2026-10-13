"use client";

import { useRouter } from "next/navigation";
import { GamePageLayout } from "@/components/layout/GamePageLayout";

/**
 * Shown on the device that previously held a seat once another device claims
 * the seat's "change device" transfer code. The server signs this device out
 * of the seat (its stored credential no longer works), so there is nothing
 * left to do here but return to the main menu. The only action — "Back to main
 * menu" — navigates home; the back arrow is hidden so there is no way to return
 * to a seat this device no longer controls.
 */
export function SeatTakenOverPage() {
  const router = useRouter();

  return (
    <GamePageLayout headerTitle="Seat moved" centerContent={true} hideBack>
      <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          This seat has moved to another device
        </h1>

        <p className="max-w-sm text-base text-gray-600">
          Someone used this seat&rsquo;s change-device code on another phone or
          tablet, so this device has been signed out of the seat. Play continues
          on the other device.
        </p>

        <div className="mt-8 w-full max-w-xs">
          <button
            type="button"
            onClick={() => router.replace("/")}
            className="w-full rounded-xl bg-blue-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-blue-700 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            Back to main menu
          </button>
        </div>
      </div>
    </GamePageLayout>
  );
}
