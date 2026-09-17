"use client";

import { useState } from "react";
import { Spinner } from "@/components/common/Spinner";
import useSWR from "swr";
import { useRequiredGame } from "@/context/GameContext";
import { GamePageLayout } from "@/components/layout/GamePageLayout";
import { Club } from "@/db/system/schema";
import { fetcher } from "@/lib/fetcher";
import { getDirectorToken } from "@/lib/director-token";
import { swrKeys } from "@/swr/swr-keys";

interface DownloadPbnPageProps {
  onPbnDownloaded: () => void;
  onCancel: () => void;
}

export function DownloadPbnPage({
  onPbnDownloaded,
  onCancel,
}: DownloadPbnPageProps) {
  const { game } = useRequiredGame();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Club info is read-only here — it is configured (admin-gated) in Settings.
  // The club name is written into the PBN `Site` tag, so it must be set.
  const { data, isLoading: loading } = useSWR<{ club: Club | null }>(
    swrKeys.club(),
    fetcher,
  );

  const club = data?.club ?? null;
  const clubConfigured = !!club?.name?.trim() && !!club?.clubNumber?.trim();

  async function handleDownload(e: React.FormEvent) {
    e.preventDefault();

    if (!clubConfigured) {
      setError(
        "Club name and EBU number must be set in Settings before exporting.",
      );
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Fetch the PBN file and trigger download via blob URL. The export is
      // director-authed; the token travels in the `x-director-token` header
      // (this is a GET, so it can't carry a JSON body).
      const pbnRes = await fetch(`/api/games/${game.gameId}/pbn`, {
        headers: { "x-director-token": getDirectorToken(game.gameId) ?? "" },
      });
      if (!pbnRes.ok) {
        const errData = await pbnRes.json().catch(() => null);
        setError(errData?.error ?? "Failed to generate PBN file");
        setSaving(false);
        return;
      }

      const blob = await pbnRes.blob();
      const url = URL.createObjectURL(blob);
      const filename =
        pbnRes.headers
          .get("Content-Disposition")
          ?.match(/filename="(.+)"/)?.[1] ?? "results.pbn";

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onPbnDownloaded();
    } catch {
      setError("Network error. Please try again.");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-white">
        <Spinner />
      </div>
    );
  }

  return (
    <GamePageLayout
      headerTitle="Download PBN"
      centerContent={true}
      actions={
        <div className="flex flex-col gap-3 pt-6">
          <button
            type="submit"
            form="download-pbn-form"
            disabled={saving || !clubConfigured}
            className="w-full py-3.5 text-lg font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50"
          >
            {saving ? "Preparing..." : "Download PBN"}
          </button>

          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="w-full py-3.5 text-lg font-semibold bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            Cancel
          </button>
        </div>
      }
    >
      <form onSubmit={handleDownload} className="px-6" id="download-pbn-form">
        {clubConfigured ? (
          <>
            <p className="text-sm text-gray-600 mb-4">
              This exports the entered deals as a PBN (Portable Bridge Notation)
              file, one block per board. The club name is used as the PBN site.
              To change it, edit Club Information in Settings.
            </p>

            <dl className="space-y-4">
              <div>
                <dt className="block text-sm font-medium text-gray-700 mb-1">
                  Club Name
                </dt>
                <dd
                  data-testid="pbn-club-name"
                  className="w-full p-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-900"
                >
                  {club!.name}
                </dd>
              </div>
            </dl>
          </>
        ) : (
          <p className="text-sm text-red-600">
            Club name and EBU number must be set in Settings before exporting.
          </p>
        )}

        {error && (
          <p className="text-sm text-red-600 mt-4" role="alert">
            {error}
          </p>
        )}
      </form>
    </GamePageLayout>
  );
}
