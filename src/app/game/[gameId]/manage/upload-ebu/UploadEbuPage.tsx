"use client";

import { useState } from "react";
import useSWR from "swr";
import { useRequiredGame } from "@/context/GameContext";
import { GamePageLayout } from "@/components/layout/GamePageLayout";
import { Spinner } from "@/components/common/Spinner";
import { fetcher } from "@/lib/fetcher";
import { getDirectorToken } from "@/lib/director-token";
import { swrKeys } from "@/swr/swr-keys";
import type { EbuStatus } from "@/db/system/queries/ebu-credentials";

interface UploadEbuPageProps {
  onCancel: () => void;
}

type UploadState =
  | { kind: "idle" }
  | { kind: "success"; message: string; advisories: string[] }
  | { kind: "error"; message: string; advisories: string[] };

export function UploadEbuPage({ onCancel }: UploadEbuPageProps) {
  const { game } = useRequiredGame();

  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadState>({ kind: "idle" });

  const { data: status, isLoading } = useSWR<EbuStatus>(
    swrKeys.ebu(),
    fetcher,
  );

  const configured = status?.configured ?? false;

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setUploading(true);
    setResult({ kind: "idle" });

    try {
      const res = await fetch(`/api/games/${game.gameId}/ebu/upload`, {
        method: "POST",
        headers: { "x-director-token": getDirectorToken(game.gameId) ?? "" },
      });
      const body = await res.json().catch(() => null);

      if (res.ok) {
        // The route returns the EBU's own outcome. `ok` reflects whether the
        // submission was accepted; the message is shown either way.
        const message =
          body?.result?.message ??
          (body?.result?.ok ? "Submission successful" : "Submission failed");
        const advisories: string[] = body?.result?.advisories ?? [];
        setResult(
          body?.result?.ok
            ? { kind: "success", message, advisories }
            : { kind: "error", message, advisories },
        );
      } else {
        setResult({
          kind: "error",
          message: body?.error ?? "Submission failed. Please try again.",
          advisories: [],
        });
      }
    } catch {
      setResult({
        kind: "error",
        message: "Network error. Please try again.",
        advisories: [],
      });
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
      headerTitle="Submit to EBU"
      centerContent={true}
      backAction={onCancel}
      actions={
        <button
          type="submit"
          form="upload-ebu-form"
          disabled={uploading || !configured}
          className="w-full py-3.5 text-lg font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50"
        >
          {uploading ? "Submitting..." : "Submit to EBU"}
        </button>
      }
    >
      <form onSubmit={handleUpload} className="px-6" id="upload-ebu-form">
        {configured ? (
          <p className="text-sm text-gray-600 mb-4">
            This submits the game results (USEBIO) to the English Bridge Union
            for masterpoints and NGS grading
            {status?.ebuNumber ? ` for EBU number ${status.ebuNumber}` : ""}.
          </p>
        ) : (
          <p role="alert" className="text-red-600 text-base">
            EBU is not configured. Add your EBU number and password in Settings
            before submitting.
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

        {(result.kind === "success" || result.kind === "error") &&
          result.advisories.length > 0 && (
            <ul className="mt-4 space-y-1 text-sm text-amber-700 list-disc list-inside">
              {result.advisories.map((note, i) => (
                <li key={i}>{note}</li>
              ))}
            </ul>
          )}
      </form>
    </GamePageLayout>
  );
}
