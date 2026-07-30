"use client";

import { useState } from "react";
import { getSocket } from "@/lib/socket";
import { SocketEvents } from "@/socket/socket-events";
import { setDirectorToken } from "@/lib/director-token";

interface Props {
  gameId: string;
  gameName: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ClaimDirectorCode({ gameId, gameName, onSuccess, onCancel }: Props) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;

    setError(null);
    setLoading(true);

    getSocket().emit(
      SocketEvents.CLAIM_DIRECTOR_CODE,
      { code: code.trim().toUpperCase() },
      (res: { success: boolean; directorToken?: string; gameId?: string; error?: string }) => {
        setLoading(false);

        if (res.success && res.directorToken && res.gameId) {
          setDirectorToken(res.gameId, res.directorToken);
          onSuccess();
        } else {
          setError(res.error ?? "Failed to claim code");
        }
      },
    );
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-white px-6">
      <h1 className="text-xl font-bold text-gray-900 mb-2">
        Become Director
      </h1>
      <p className="text-base text-gray-600 mb-8 text-center">
        Enter the share code for <strong>{gameName}</strong>
      </p>

      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
        <div>
          <label htmlFor="share-code" className="sr-only">Share Code</label>
          <input
            id="share-code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Enter code"
            maxLength={6}
            autoFocus
            autoComplete="off"
            className="w-full text-center text-3xl font-mono font-bold tracking-[0.3em] p-4 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
          />
        </div>

        {error && (
          <p role="alert" className="text-red-600 text-base text-center">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || code.length < 6}
          className="w-full py-3.5 text-lg font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-[0.98] transition disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          {loading ? "Claiming..." : "Claim Access"}
        </button>

        <button
          type="button"
          onClick={onCancel}
          className="w-full py-3 text-base font-semibold text-gray-600 hover:text-gray-800 transition"
        >
          Cancel
        </button>
      </form>
    </div>
  );
}
