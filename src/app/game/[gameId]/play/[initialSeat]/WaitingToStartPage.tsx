"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GamePageLayout } from "@/components/layout/GamePageLayout";
import { parseSeat, Seat } from "@/model/participants";
import { PairDirection } from "@/model/common";
import { useSections } from "@/hooks/sections";
import { leaveTable } from "@/lib/game-service";
import { ChangeDeviceButton } from "@/app/game/[gameId]/play/[initialSeat]/ChangeDeviceButton";

interface Props {
  gameId: string;
  /** The seat the player took (section-qualified, e.g. "A3NS"). */
  seat: Seat;
}

const DIRECTION_LABEL: Record<PairDirection, string> = {
  NS: "North–South",
  EW: "East–West",
};

/**
 * Shown to a seated player while the game has not yet been started by the
 * director. Their schedule only exists once the movement is materialized at
 * start, so instead of an indefinite spinner we confirm their seat and tell
 * them what to expect. `usePlayFlow` revalidates on `GAME_UPDATED`, so this
 * screen advances into play automatically the moment the director starts.
 */
export function WaitingToStartPage({ gameId, seat }: Props) {
  const { sections } = useSections(gameId);
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLeave() {
    if (
      !window.confirm(
        "Leave this table? Your seat will be freed for someone else.",
      )
    ) {
      return;
    }
    setError(null);
    setLeaving(true);
    try {
      await leaveTable(gameId, seat);
      router.replace(`/game/${gameId}/join`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not leave the table.",
      );
      setLeaving(false);
    }
  }

  let section: string | null = null;
  let tableNumber: number | null = null;
  let direction: PairDirection | null = null;
  try {
    const parsed = parseSeat(seat);
    section = parsed.section;
    tableNumber = parsed.tableNumber;
    direction = parsed.direction;
  } catch {
    // Fall back to a seat-less message if the seat can't be parsed.
  }

  // Only surface the section when the game actually has more than one, so
  // single-section games don't show a meaningless "Section A".
  const showSection = sections.length > 1 && section != null;

  return (
    <GamePageLayout headerTitle="You're seated" centerContent={true}>
      <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
        <div
          className="mb-6 h-3 w-3 animate-pulse rounded-full bg-blue-600"
          aria-hidden="true"
        />

        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          Waiting for the director to start the game
        </h1>

        {tableNumber != null && direction != null ? (
          <p className="mb-6 text-base text-gray-600">
            You&rsquo;re seated{showSection ? ` in Section ${section}` : ""} at{" "}
            <span className="font-semibold text-gray-900">
              Table {tableNumber}
            </span>
            , playing{" "}
            <span className="font-semibold text-gray-900">
              {DIRECTION_LABEL[direction]}
            </span>
            .
          </p>
        ) : (
          <p className="mb-6 text-base text-gray-600">
            You&rsquo;re seated and ready to play.
          </p>
        )}

        <p
          className="max-w-sm text-sm text-gray-500"
          role="status"
          aria-live="polite"
        >
          Keep this screen open — it will move on by itself as soon as the game
          starts. No need to refresh.
        </p>

        {error && (
          <p role="alert" className="mt-4 text-sm font-medium text-red-700">
            {error}
          </p>
        )}

        <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
          <ChangeDeviceButton gameId={gameId} seat={seat} />
          <button
            type="button"
            onClick={handleLeave}
            disabled={leaving}
            className="w-full rounded-xl border border-gray-300 bg-white px-6 py-3 text-base font-semibold text-gray-700 transition hover:bg-gray-50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {leaving ? "Leaving…" : "Leave table"}
          </button>
        </div>
      </div>
    </GamePageLayout>
  );
}
