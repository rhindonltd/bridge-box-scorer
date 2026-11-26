"use client";

import { useState } from "react";
import { Spinner } from "@/components/common/Spinner";
import useSWR from "swr";
import { useRequiredGame } from "@/context/GameContext";
import { GamePageLayout } from "@/components/layout/GamePageLayout";
import type { Club } from "@/db/system/schema";
import { fetcher } from "@/lib/fetcher";
import { swrKeys } from "@/swr/swr-keys";

interface DownloadUsebioPageProps {
  onUsebioDownloaded: () => void;
  onCancel: () => void;
}

export function DownloadUsebioPage({
  onUsebioDownloaded,
  onCancel,
}: DownloadUsebioPageProps) {
  const { game } = useRequiredGame();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Club info is read-only here — it is configured (admin-gated) in Settings.
  const { data, isLoading: loading } = useSWR<{ club: Club | null }>(
    swrKeys.club(),
    fetcher,
  );

  const club = data?.club ?? null;
  const clubConfigured = !!club?.name?.trim() && !!club?.clubNumber?.trim();

  async function handleDownload(e: React.FormEvent) {
    e.preventDefault();

    // Club info is a device setting configured (admin-gated) in Settings; it is
    // not editable here. Without it the USEBIO export cannot be produced.
    if (!clubConfigured) {
      setError(
        "Club name and EBU number must be set in Settings → EBU before exporting.",
      );
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Fetch the USEBIO file and trigger download via blob URL. Downloads are
      // open to anyone once the director has finalised the game; the file uses
      // the tournament level the director saved on the game.
      const usebioRes = await fetch(`/api/games/${game.gameId}/usebio`);
      if (!usebioRes.ok) {
        const errData = await usebioRes.json().catch(() => null);
        setError(errData?.error ?? "Failed to generate USEBIO file");
        setSaving(false);
        return;
      }

      const blob = await usebioRes.blob();
      const url = URL.createObjectURL(blob);
      const filename =
        usebioRes.headers
          .get("Content-Disposition")
          ?.match(/filename="(.+)"/)?.[1] ?? "results.xml";

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onUsebioDownloaded();
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
      headerTitle="Download USEBIO"
      centerContent={true}
      actions={
        <div className="flex flex-col gap-3 pt-6">
          <button
            type="submit"
            form="download-usebio-form"
            disabled={saving || !clubConfigured}
            className="w-full py-3.5 text-lg font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50"
          >
            {saving ? "Preparing..." : "Download USEBIO"}
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
      <form
        onSubmit={handleDownload}
        className="px-6"
        id="download-usebio-form"
      >
        {clubConfigured ? (
          <>
            <p className="text-sm text-gray-600 mb-4">
              These club details will be included in the USEBIO file. To change
              them, go to Settings → EBU.
            </p>

            <dl className="space-y-4">
              <div>
                <dt className="block text-sm font-medium text-gray-700 mb-1">
                  Club Name
                </dt>
                <dd
                  data-testid="usebio-club-name"
                  className="w-full p-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-900"
                >
                  {club!.name}
                </dd>
              </div>

              <div>
                <dt className="block text-sm font-medium text-gray-700 mb-1">
                  EBU Club Number
                </dt>
                <dd
                  data-testid="usebio-club-number"
                  className="w-full p-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-900"
                >
                  {club!.clubNumber}
                </dd>
              </div>
            </dl>
          </>
        ) : (
          <p role="alert" className="text-red-600 text-base">
            Club name and EBU number must be set in Settings → EBU before
            exporting.
          </p>
        )}

        {error && (
          <p role="alert" className="text-red-600 text-base text-center mt-4">
            {error}
          </p>
        )}
      </form>
    </GamePageLayout>
  );
}
