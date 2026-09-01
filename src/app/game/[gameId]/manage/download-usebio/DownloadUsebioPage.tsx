"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { useRequiredGame } from "@/context/GameContext";
import { GamePageLayout } from "@/components/layout/GamePageLayout";
import { Club } from "@/db/system/schema";
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

  const [name, setName] = useState("");
  const [clubNumber, setClubNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    data,
    isLoading: loading,
    mutate,
  } = useSWR<{ club: Club | null }>(swrKeys.club(), fetcher);

  // Seed the form fields once the club record loads.
  useEffect(() => {
    if (data?.club) {
      setName(data.club.name);
      setClubNumber(data.club.clubNumber);
    }
  }, [data]);

  async function handleDownload(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !clubNumber.trim()) {
      setError("Both club name and number are required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Save club info first
      const saveRes = await fetch("/api/system/club", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          clubNumber: clubNumber.trim(),
        }),
      });

      if (!saveRes.ok) {
        setError("Failed to save club info");
        setSaving(false);
        return;
      }

      // Revalidate the shared club cache so other views reflect the save.
      await mutate();

      // Fetch the USEBIO file and trigger download via blob URL
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
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <GamePageLayout
      headerTitle="Download USEBIO"
      centerContent={true}
      children={
        <form
          onSubmit={handleDownload}
          className="px-6"
          id="download-usebio-form"
        >
          <p className="text-sm text-gray-600 mb-4">
            Confirm your club details before downloading. These will be included
            in the USEBIO file.
          </p>

          <div className="space-y-4 flex-1">
            <div>
              <label
                htmlFor="club-name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Club Name
              </label>
              <input
                id="club-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Anytown Bridge Club"
                className="w-full p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="club-number"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                EBU Club Number
              </label>
              <input
                id="club-number"
                type="text"
                value={clubNumber}
                onChange={(e) => setClubNumber(e.target.value)}
                placeholder="e.g. 12345"
                className="w-full p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {error && (
              <p role="alert" className="text-red-600 text-base text-center">
                {error}
              </p>
            )}
          </div>
        </form>
      }
      actions={
        <div className="flex flex-col gap-3 pt-6">
          <button
            type="submit"
            form="download-usebio-form"
            disabled={saving}
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
    />
  );
}
