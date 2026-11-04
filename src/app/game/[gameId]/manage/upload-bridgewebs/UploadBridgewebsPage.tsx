"use client";

import { useState } from "react";
import useSWR from "swr";
import { useRequiredGame } from "@/context/GameContext";
import { GamePageLayout } from "@/components/layout/GamePageLayout";
import { Spinner } from "@/components/common/Spinner";
import { TournamentLevelSelect } from "@/components/common/TournamentLevelSelect";
import { TournamentLevel } from "@/db/games/types/tournament-level";
import { DEFAULT_TOURNAMENT_LEVEL } from "@/model/tournament-level";
import { fetcher } from "@/lib/fetcher";
import { getDirectorToken } from "@/lib/director-token";
import { swrKeys } from "@/swr/swr-keys";
import type { BridgewebsStatus } from "@/db/system/queries/bridgewebs-credentials";

interface UploadBridgewebsPageProps {
  onCancel: () => void;
}

type UploadState =
  | { kind: "idle" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

export function UploadBridgewebsPage({ onCancel }: UploadBridgewebsPageProps) {
  const { game, mutateGame } = useRequiredGame();

  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadState>({ kind: "idle" });

  // Pre-fill from the game's last-used level (default for an older row); the
  // chosen level is persisted on the server as part of the upload.
  const [tournamentLevel, setTournamentLevel] = useState<TournamentLevel>(
    game.tournamentLevel ?? DEFAULT_TOURNAMENT_LEVEL,
  );

  const { data: status, isLoading } = useSWR<BridgewebsStatus>(
    swrKeys.bridgewebs(),
    fetcher,
  );

  const configured = status?.configured ?? false;

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setUploading(true);
    setResult({ kind: "idle" });

    try {
      const res = await fetch(`/api/games/${game.gameId}/bridgewebs/upload`, {
        method: "POST",
        headers: {
          "x-director-token": getDirectorToken(game.gameId) ?? "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tournamentLevel }),
      });
      const body = await res.json().catch(() => null);

      if (res.ok) {
        // The server saved this level; reflect it locally so a re-open
        // pre-fills the same choice.
        mutateGame({ ...game, tournamentLevel }, false);
        // The route returns the parsed BridgeWebs reply. `ok` reflects its
        // status message; show it either way.
        const message =
          body?.result?.message ??
          (body?.result?.ok ? "Upload successful" : "Upload failed");
        setResult(
          body?.result?.ok
            ? { kind: "success", message }
            : { kind: "error", message },
        );
      } else {
        setResult({
          kind: "error",
          message: body?.error ?? "Upload failed. Please try again.",
        });
      }
    } catch {
      setResult({ kind: "error", message: "Network error. Please try again." });
    } finally {
      setUploading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-white">
        <Spinner />
      </div>
    );
  }

  return (
    <GamePageLayout
      headerTitle="Upload to BridgeWebs"
      centerContent={true}
      backAction={onCancel}
      actions={
        <button
          type="submit"
          form="upload-bridgewebs-form"
          disabled={uploading || !configured}
          className="w-full py-3.5 text-lg font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50"
        >
          {uploading ? "Uploading..." : "Upload to BridgeWebs"}
        </button>
      }
    >
      <form onSubmit={handleUpload} className="px-6" id="upload-bridgewebs-form">
        {configured ? (
          <>
            <p className="text-sm text-gray-600 mb-4">
              This uploads the game results (USEBIO) and hand records (PBN) to
              your BridgeWebs site
              {status?.club ? ` for club "${status.club}"` : ""}.
            </p>

            <TournamentLevelSelect
              value={tournamentLevel}
              onChange={setTournamentLevel}
              disabled={uploading}
            />
          </>
        ) : (
          <p role="alert" className="text-red-600 text-base">
            BridgeWebs is not configured. Add your club code and password in
            Settings before uploading.
          </p>
        )}

        {result.kind === "success" && (
          <p
            role="status"
            className="text-green-700 text-base text-center mt-4"
          >
            ✅ {result.message}
          </p>
        )}
        {result.kind === "error" && (
          <p role="alert" className="text-red-600 text-base text-center mt-4">
            {result.message}
          </p>
        )}
      </form>
    </GamePageLayout>
  );
}
