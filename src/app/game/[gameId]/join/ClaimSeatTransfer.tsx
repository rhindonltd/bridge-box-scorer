"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  claimSeatTransfer,
  inspectSeatTransfer,
  type SeatTransferRealPair,
} from "@/lib/game-service";
import { ClaimSeatTransferView } from "./ClaimSeatTransferView";
import { ClaimHandoverNamesView } from "./ClaimHandoverNamesView";
import type { NewPlayer } from "@/db/games/tables/players";

type Step = "code" | "names";

/**
 * "Move a seat to this device" affordance for the join screen. Enter a transfer
 * code; the code is first inspected. For a plain change-device transfer the
 * claim happens immediately and routes into play. For a §2.4.7 HANDOVER seat
 * (held by a stand-in) a second step collects the arriving pair's names before
 * claiming — the server then runs the handover and signs out the stand-in's old
 * device.
 */
export function ClaimSeatTransfer() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("code");
  const [code, setCode] = useState("");
  const [player1, setPlayer1] = useState<NewPlayer | null>(null);
  const [player2, setPlayer2] = useState<NewPlayer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function reset() {
    setStep("code");
    setCode("");
    setPlayer1(null);
    setPlayer2(null);
    setError(null);
    setLoading(false);
  }

  function handleClose() {
    if (loading) return;
    setOpen(false);
    reset();
  }

  function routeIntoPlay(gameId: string, seat: string) {
    router.replace(`/game/${gameId}/play/${seat}`);
  }

  // Step 1: inspect the code. A plain transfer claims immediately; a handover
  // advances to the names step.
  function handleCodeSubmit() {
    if (code.trim().length < 6) return;
    const trimmed = code.trim().toUpperCase();
    setError(null);
    setLoading(true);

    inspectSeatTransfer(trimmed)
      .then((info) => {
        if (info.isHandover) {
          setStep("names");
          setLoading(false);
          return;
        }
        // Plain change-device: claim straight away.
        return claimSeatTransfer(trimmed).then(({ gameId, seat }) =>
          routeIntoPlay(gameId, seat),
        );
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to move seat");
        setLoading(false);
      });
  }

  // Step 2 (handover only): claim with the arriving pair's names.
  function handleNamesSubmit() {
    if (player1 == null || player2 == null) return;
    const realPair: SeatTransferRealPair = { player1, player2 };
    setError(null);
    setLoading(true);

    claimSeatTransfer(code.trim().toUpperCase(), realPair)
      .then(({ gameId, seat }) => routeIntoPlay(gameId, seat))
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : "Failed to take over seat",
        );
        setLoading(false);
      });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-semibold text-yellow-900 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500"
      >
        Moving from another device? Enter a code
      </button>

      {/* Presented as a full-screen page (header bar + back button + centered
          form + fixed-bottom action) rather than a small dialog. Pinned over
          the app within its max-width cage. */}
      {open && (
        <div className="fixed inset-0 z-50 bg-white">
          <div className="mx-auto flex h-full max-w-2xl flex-col">
            {step === "code" ? (
              <ClaimSeatTransferView
                code={code}
                error={error}
                loading={loading}
                onCodeChange={setCode}
                onSubmit={handleCodeSubmit}
                onCancel={handleClose}
              />
            ) : (
              <ClaimHandoverNamesView
                player1={player1}
                player2={player2}
                error={error}
                loading={loading}
                onPlayer1Change={setPlayer1}
                onPlayer2Change={setPlayer2}
                onSubmit={handleNamesSubmit}
                onBack={() => {
                  setStep("code");
                  setError(null);
                }}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
