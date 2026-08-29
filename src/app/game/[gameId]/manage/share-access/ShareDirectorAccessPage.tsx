"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socket";
import { SocketEvents } from "@/socket/socket-events";
import { getDirectorToken } from "@/lib/director-token";
import { GamePageLayout } from "@/components/layout/GamePageLayout";

interface Props {
  gameId: string;
  onBack: () => void;
}

export function ShareDirectorAccessPage({ gameId, onBack }: Props) {
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expiresIn, setExpiresIn] = useState(300); // 5 minutes in seconds
  const hasMounted = useRef(false);

  const generateCode = useCallback(() => {
    setError(null);
    setCode(null);
    setExpiresIn(300);

    getSocket().emit(
      SocketEvents.GENERATE_SHARE_CODE,
      { gameId, directorToken: getDirectorToken(gameId) },
      (res: { success: boolean; code?: string; error?: string }) => {
        if (res.success && res.code) {
          setCode(res.code);
        } else {
          setError(res.error ?? "Failed to generate code");
        }
      },
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
      backAction={onBack}
      children={
        <>
          {error && <p className="text-red-600 text-base mb-4">{error}</p>}

          {code ? (
            <>
              {/* Code display */}
              <div className="bg-gray-100 border-2 border-gray-300 rounded-2xl px-8 py-6 mb-4">
                <div className="text-4xl font-mono font-bold tracking-[0.3em] text-center text-gray-900">
                  {code}
                </div>
              </div>

              <p className="text-base text-gray-600 text-center mb-2">
                Give this code to the other director.
              </p>
              <p className="text-base font-semibold text-gray-800 mb-6">
                Expires in {minutes}:{String(seconds).padStart(2, "0")}
              </p>

              <button
                onClick={generateCode}
                className="px-6 py-3 text-base font-semibold bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 mb-3"
              >
                Generate New Code
              </button>
            </>
          ) : expiresIn === 0 ? (
            <>
              <p className="text-base text-gray-600 mb-4">Code expired.</p>
              <button
                onClick={generateCode}
                className="px-6 py-3 text-base font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 mb-3"
              >
                Generate New Code
              </button>
            </>
          ) : (
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
          )}
        </>
      }
    />
  );
}
