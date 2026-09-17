"use client";

import { useState } from "react";
import useSWR from "swr";
import { useRequiredGame } from "@/context/GameContext";
import { GamePageLayout } from "@/components/layout/GamePageLayout";
import { Spinner } from "@/components/common/Spinner";
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
  const { game } = useRequiredGame();

  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadState>({ kind: "idle" });

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
      const res = await fetch(
        `/api/games/${game.gameId}/bridgewebs/upload`,
        {
          method: "POST",
          headers: { "x-director-token": getDirectorToken(game.gameId) ?? "" },
        },
      );
      const body = await res.json().catch(() => null);

      if (res.ok) {
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
      actions={
        <div className="flex flex-col gap-3 pt-6">
          <button
            type="submit"
            form="upload-bridgewebs-form"
            disabled={uploading || !configured}
            className="w-full py-3.5 text-lg font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50"
          >
            {uploading ? "Uploading..." : "Upload to BridgeWebs"}
          </button>

          <button
            type="button"
            onClick={onCancel}
            disabled={uploading}
            className="w-full py-3.5 text-lg font-semibold bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            Back
          </button>
        </div>
      }
    >
      <form onSubmit={handleUpload} className="px-6" id="upload-bridgewebs-form">
        {configured ? (
          <p className="text-sm text-gray-600 mb-4">
            This uploads the game results (USEBIO) and hand records (PBN) to your
            BridgeWebs site
            {status?.club ? ` for club "${status.club}"` : ""}.
          </p>
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
