"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { generateSeatTransferCode } from "@/lib/game-service";

interface Props {
  gameId: string;
  /** The seat being moved (section-qualified, e.g. "A3NS"). */
  seat: string;
}

/** How long a transfer code stays valid, in seconds (mirrors CODE_TTL_MS). */
const EXPIRY_SECONDS = 300;

/**
 * "Change device" content: mints a single-use transfer code for this seat and
 * shows it with a countdown, so the code can be typed into another device to
 * take over the seat. Claiming rotates the seat's secret, so once the code is
 * used this device is signed out of the seat.
 *
 * Self-contained (like ShareDirectorAccessPage) so it can be dropped into a
 * dialog from either the waiting screen or the live play header.
 */
export function ChangeDeviceView({ gameId, seat }: Props) {
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expiresIn, setExpiresIn] = useState(EXPIRY_SECONDS);
  const hasMounted = useRef(false);

  const generate = useCallback(() => {
    setError(null);
    setCode(null);
    setExpiresIn(EXPIRY_SECONDS);

    generateSeatTransferCode(gameId, seat)
      .then((newCode) => setCode(newCode))
      .catch((err) =>
        setError(
          err instanceof Error ? err.message : "Failed to generate code",
        ),
      );
  }, [gameId, seat]);

  // Generate once on mount.
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      generate();
    }
  }, [generate]);

  // Countdown; drop the code when it expires.
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
    <div className="flex flex-col items-center text-center">
      <p className="mb-4 text-sm text-gray-600">
        On your other device, open this game, choose{" "}
        <span className="font-semibold">Move a seat to this device</span>, and
        enter the code below.
      </p>

      {error && (
        <p role="alert" className="mb-4 text-base text-red-600">
          {error}
        </p>
      )}

      {code ? (
        <>
          <div className="mb-4 w-full rounded-2xl border-2 border-gray-300 bg-gray-100 px-8 py-6">
            <div
              data-testid="seat-transfer-code"
              className="text-center font-mono text-4xl font-bold tracking-[0.3em] text-gray-900"
            >
              {code}
            </div>
          </div>

          <p className="mb-6 text-base font-semibold text-gray-800">
            Expires in {minutes}:{String(seconds).padStart(2, "0")}
          </p>

          <button
            type="button"
            onClick={generate}
            className="rounded-xl bg-gray-200 px-6 py-3 text-base font-semibold text-gray-800 transition hover:bg-gray-300 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Generate new code
          </button>
        </>
      ) : expiresIn === 0 ? (
        <>
          <p className="mb-4 text-base text-gray-600">Code expired.</p>
          <button
            type="button"
            onClick={generate}
            className="rounded-xl bg-blue-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-blue-700 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Generate new code
          </button>
        </>
      ) : (
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      )}

      <p className="mt-6 text-xs text-gray-500">
        Once the code is used, this device will be signed out of the seat.
      </p>
    </div>
  );
}
