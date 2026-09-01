"use client";

import { useState } from "react";
import { useRequiredGame } from "@/context/GameContext";
import { clearDirectorToken, getDirectorToken } from "@/lib/director-token";
import { GamePageLayout } from "@/components/layout/GamePageLayout";

interface DeleteGamePageProps {
  onGameDeleted: () => void;
  onCancel: () => void;
}

export function DeleteGamePage({
  onGameDeleted,
  onCancel,
}: DeleteGamePageProps) {
  const { game } = useRequiredGame();

  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/games/${game.gameId}/delete`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          directorToken: getDirectorToken(game.gameId),
        }),
      });

      if (res.ok) {
        clearDirectorToken(game.gameId);
        onGameDeleted();
      } else {
        const data = await res.json();
        setError(data.error ?? "Failed to delete game");
        setDeleting(false);
      }
    } catch {
      setError("Network error. Please try again.");
      setDeleting(false);
    }
  }

  function handleCancel() {
    onCancel();
  }

  return (
    <GamePageLayout
      headerTitle="Delete Game"
      centerContent={true}
      actions={
        <div className="flex flex-col gap-3 pt-4">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="w-full py-3.5 text-lg font-semibold bg-red-600 text-white rounded-xl hover:bg-red-700 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleting ? "Deleting..." : "Yes, Delete Game"}
          </button>

          <button
            onClick={handleCancel}
            disabled={deleting}
            className="w-full py-3.5 text-lg font-semibold bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            Cancel
          </button>
        </div>
      }
    >
      {/* Confirmation content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="max-w-sm w-full text-center space-y-6">
          <p className="text-lg text-gray-900">
            Are you sure you want to delete <strong>{game.eventName}</strong>?
          </p>
          <p className="text-base text-gray-600">
            This will permanently remove all results, scores, and game data.
            This action cannot be undone.
          </p>

          {error && (
            <p role="alert" className="text-red-600 text-base">
              {error}
            </p>
          )}
        </div>
      </div>
    </GamePageLayout>
  );
}
