"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Spinner } from "@/components/common/Spinner";
import { generateSeatTransferCode } from "@/lib/game-service";

interface Props {
  gameId: string;
  /** The seat being moved (section-qualified, e.g. "A3NS"). */
  seat: string;
  /**
   * What the claim will do — passed to the mint so the code carries its intent:
   *  - CHANGE_DEVICE (default): the SAME pair moves to a new device.
   *  - HANDOVER: a DIFFERENT arriving pair takes over this seat (the claim then
   *    collects their names).
   *  - REINSTATE: a WITHDRAWN pair returns on a device.
   * Only the copy differs; the code-display + countdown behaviour is shared.
   */
  kind?: "CHANGE_DEVICE" | "HANDOVER" | "REINSTATE";
  /**
   * CHANGE_DEVICE only: the DIRECTOR is moving the seat because the pair's
   * device has died, so the code is minted with the director credential and the
   * copy speaks about the pair's new device rather than "your other device".
   */
  byDirector?: boolean;
}

/** How long a transfer code stays valid, in seconds (mirrors CODE_TTL_MS). */
const EXPIRY_SECONDS = 300;

/**
 * Transfer-code content: mints a single-use code for this seat and shows it
 * with a countdown, so the code can be typed into another device. Claiming
 * rotates the seat's secret, so once the code is used this device is signed out
 * of the seat.
 *
 * Shared by the "Change device" dialog (same pair, new device) and the
 * different-device "Handover" flow (a new pair takes over) — `kind` selects the
 * code's intent and the instructional copy; everything else is identical.
 *
 * Self-contained (like ShareDirectorAccessPage) so it can be dropped into a
 * dialog or a page from either the waiting screen or the live play header.
 */
export function ChangeDeviceView({
  gameId,
  seat,
  kind = "CHANGE_DEVICE",
  byDirector = false,
}: Props) {
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expiresIn, setExpiresIn] = useState(EXPIRY_SECONDS);
  const hasMounted = useRef(false);

  const generate = useCallback(() => {
    setError(null);
    setCode(null);
    setExpiresIn(EXPIRY_SECONDS);

    generateSeatTransferCode(gameId, seat, kind, byDirector)
      .then((newCode) => setCode(newCode))
      .catch((err) =>
        setError(
          err instanceof Error ? err.message : "Failed to generate code",
        ),
      );
  }, [gameId, seat, kind, byDirector]);

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

  const isHandover = kind === "HANDOVER";
  const isReinstate = kind === "REINSTATE";

  return (
    <div className="flex flex-col items-center text-center">
      <p className="mb-4 text-sm text-gray-600">
        {isHandover ? (
          <>
            On the arriving pair&rsquo;s device, open this game, choose{" "}
            <span className="font-semibold">Move a seat to this device</span>,
            enter the code below, then enter their names.
          </>
        ) : byDirector ? (
          <>
            On the pair&rsquo;s new device, open this game, choose{" "}
            <span className="font-semibold">Move a seat to this device</span>,
            and enter the code below. Their old device will be signed out.
          </>
        ) : isReinstate ? (
          <>
            On the returning pair&rsquo;s device, open this game, choose{" "}
            <span className="font-semibold">Move a seat to this device</span>,
            and enter the code below.
          </>
        ) : (
          <>
            On your other device, open this game, choose{" "}
            <span className="font-semibold">Move a seat to this device</span>,
            and enter the code below.
          </>
        )}
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
        <Spinner />
      )}

      <p className="mt-6 text-xs text-gray-500">
        {isHandover
          ? "Once the arriving pair claims the code, this device will be signed out of the seat."
          : isReinstate
            ? "The returning pair claims the code on their device to pick up the seat again."
            : "Once the code is used, this device will be signed out of the seat."}
      </p>
    </div>
  );
}
