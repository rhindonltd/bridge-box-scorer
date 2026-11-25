"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { TournamentLevelSelect } from "@/components/common/TournamentLevelSelect";
import { useRequiredGame } from "@/context/GameContext";
import type { TournamentLevel } from "@/model/game-types";
import type { BridgewebsStatus } from "@/db/system/queries/bridgewebs-credentials";
import type { EbuStatus } from "@/db/system/queries/ebu-credentials";
import { errorMessage } from "@/lib/error-message";
import { fetcher } from "@/lib/fetcher";
import { clearNavIntent, setNavIntent } from "@/lib/nav-intent";
import { reopenGame, saveTournamentLevel } from "@/lib/game-service";
import { DEFAULT_TOURNAMENT_LEVEL } from "@/model/tournament-level";
import { swrKeys } from "@/swr/swr-keys";

const buttonClass =
  "w-full py-3.5 text-lg font-semibold bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed pl-4";

/**
 * The director-only part of the export page of a finalised game: the EBU
 * tournament level (which the USEBIO file uses), uploads to BridgeWebs and the
 * EBU, and "Reopen game". Only rendered on a device holding the director token;
 * the server enforces the same on every action.
 */
export function ExportDirectorSection({ gameId }: { gameId: string }) {
  const router = useRouter();
  const { game, mutateGame } = useRequiredGame();

  const { data: bridgewebs } = useSWR<BridgewebsStatus>(
    swrKeys.bridgewebs(),
    fetcher,
  );
  const { data: ebu } = useSWR<EbuStatus>(swrKeys.ebu(), fetcher);

  const [level, setLevel] = useState<TournamentLevel>(
    game.tournamentLevel ?? DEFAULT_TOURNAMENT_LEVEL,
  );
  const [savingLevel, setSavingLevel] = useState(false);
  const [levelError, setLevelError] = useState<string | null>(null);

  const [confirmingReopen, setConfirmingReopen] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [reopenError, setReopenError] = useState<string | null>(null);

  async function handleLevelChange(next: TournamentLevel) {
    const previous = level;
    setLevel(next);
    setSavingLevel(true);
    setLevelError(null);
    try {
      await saveTournamentLevel(gameId, next);
      void mutateGame({ ...game, tournamentLevel: next }, false);
    } catch (err) {
      setLevel(previous);
      setLevelError(errorMessage(err, "Failed to save the tournament level"));
    } finally {
      setSavingLevel(false);
    }
  }

  async function handleReopen() {
    setReopening(true);
    setReopenError(null);
    // The reopened game is broadcast before the reply, and the export guard
    // would then redirect elsewhere; send it to the main menu too.
    setNavIntent("/");
    try {
      await reopenGame(gameId);
      // The game is open again and back in Manage Games.
      router.replace("/");
      void mutateGame();
    } catch (err) {
      clearNavIntent();
      setReopenError(errorMessage(err, "Failed to reopen the game"));
      setReopening(false);
    }
  }

  return (
    <section
      aria-label="Director options"
      className="mt-4 flex flex-col gap-3 border-t border-gray-200 pt-4"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-600">
        Director
      </h2>

      <TournamentLevelSelect
        value={level}
        onChange={handleLevelChange}
        disabled={savingLevel || reopening}
      />
      {levelError && (
        <p role="alert" className="text-sm text-red-600">
          {levelError}
        </p>
      )}

      {bridgewebs?.configured && (
        <button
          onClick={() =>
            router.push(`/game/${gameId}/export/upload-bridgewebs`)
          }
          className={buttonClass}
        >
          <span className="flex items-center gap-3">Upload to BridgeWebs</span>
        </button>
      )}
      {ebu?.configured && (
        <button
          onClick={() => router.push(`/game/${gameId}/export/upload-ebu`)}
          className={buttonClass}
        >
          <span className="flex items-center gap-3">Submit to EBU</span>
        </button>
      )}

      {confirmingReopen ? (
        <div
          role="dialog"
          aria-label="Confirm reopen"
          className="flex flex-col gap-3 rounded-xl border-2 border-red-200 bg-red-50 p-4 text-red-900"
        >
          <p className="text-sm">
            Reopen this game? It leaves Export Game and returns to Manage Games,
            where results can be changed again. You will need to finalise it
            again before exporting.
          </p>
          {reopenError && (
            <p role="alert" className="text-sm text-red-700">
              {reopenError}
            </p>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => setConfirmingReopen(false)}
              disabled={reopening}
              className="flex-1 rounded-lg bg-gray-200 px-4 py-2.5 font-semibold text-gray-800 hover:bg-gray-300 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={handleReopen}
              disabled={reopening}
              className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {reopening ? "Reopening…" : "Reopen"}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setConfirmingReopen(true)}
          className="w-full py-3.5 text-lg font-semibold bg-red-100 text-red-700 rounded-xl hover:bg-red-200 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 pl-4"
        >
          <span className="flex items-center gap-3">Reopen game</span>
        </button>
      )}
    </section>
  );
}
