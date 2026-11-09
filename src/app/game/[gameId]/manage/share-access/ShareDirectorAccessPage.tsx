"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Spinner } from "@/components/common/Spinner";
import { generateShareCode } from "@/lib/game-service";
import { GamePageLayout } from "@/components/layout/GamePageLayout";

interface Props {
  gameId: string;
}

export function ShareDirectorAccessPage({ gameId }: Props) {
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expiresIn, setExpiresIn] = useState(300); // 5 minutes in seconds
  const hasMounted = useRef(false);

  const generateCode = useCallback(() => {
    setError(null);
    setCode(null);
    setExpiresIn(300);

    generateShareCode(gameId)
      .then((newCode) => setCode(newCode))
      .catch((err) =>
        setError(
          err instanceof Error ? err.message : "Failed to generate code",
        ),
      );
  }, [gameId]);

  // Generate on mount
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      generateCode();
    }
  }, [generateCode]);

  // Countdown timer
  useEffect(() => {
    if (!code) return;

    const interval = setInterval(() => {
      setExpiresIn((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCode(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [code]);

  const minutes = Math.floor(expiresIn / 60);
  const seconds = expiresIn % 60;

  return (
    <GamePageLayout
      headerTitle="Share Director Access"
      // Reached from a header hamburger on any director page (play, manage or
      // setup), so "back" returns to whichever page the director came from —
      // the header's default pops the history stack. If the screen was opened
      // directly (no in-app history), fall back to the manage menu.
      backFallbackHref={`/game/${gameId}/manage`}
      contentMode="center"
      // The regenerate button is the one primary action, so it lives in the
      // fixed bottom action bar as a full-width button (matching the rest of
      // the app) rather than floating under the code.
      actions={
        <button
          onClick={generateCode}
          className="w-full py-3.5 text-lg font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          Generate New Code
        </button>
      }
    >
      <div className="flex flex-col items-center text-center px-4">
        {error && <p className="text-red-600 text-base mb-4">{error}</p>}

        {code ? (
          <>
            {/* Code display */}
            <div className="bg-gray-100 border-2 border-gray-300 rounded-2xl px-8 py-6 mb-4">
              <div
                data-testid="share-code"
                className="text-4xl font-mono font-bold tracking-[0.3em] text-center text-gray-900"
              >
                {code}
              </div>
            </div>

            <p className="text-base text-gray-600 text-center mb-2">
              Give this code to the other director.
            </p>
            <p className="text-base font-semibold text-gray-800">
              Expires in {minutes}:{String(seconds).padStart(2, "0")}
            </p>
          </>
        ) : expiresIn === 0 ? (
          <p className="text-base text-gray-600">Code expired.</p>
        ) : (
          <Spinner />
        )}
      </div>
    </GamePageLayout>
  );
}
