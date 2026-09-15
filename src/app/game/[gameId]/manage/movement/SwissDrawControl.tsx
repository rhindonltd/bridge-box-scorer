"use client";

import { useState } from "react";
import { drawNextSwissRound, type SwissDrawAck } from "@/lib/swiss-service";

/**
 * Director control for drawing the next Swiss Pairs round, shown on the in-play
 * Movement screen for a Swiss section.
 *
 * The button is enabled only when every result for the current round is in
 * (`allResultsIn`), so the director can enter any adjusted scores first. On a
 * successful draw the new round's seating appears everywhere; the control then
 * surfaces any advisories the server returned — a repeat pairing that couldn't
 * be avoided, two stationary pairs forced to meet, or which pair is sitting out
 * (a bye). Errors (e.g. the event is already complete) are shown inline.
 */
export function SwissDrawControl({
  gameId,
  section,
  allResultsIn,
}: {
  gameId: string;
  section: string;
  allResultsIn: boolean;
}) {
  const [drawing, setDrawing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDraw() {
    setDrawing(true);
    setError(null);
    setNotice(null);
    try {
      const result = await drawNextSwissRound(gameId, section);
      setNotice(describeDraw(result));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not draw the next round.",
      );
    } finally {
      setDrawing(false);
    }
  }

  return (
    <div className="shrink-0 border-b border-gray-200 bg-gray-50 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-gray-700">
          <span className="font-semibold">Swiss Pairs</span>
          <span className="text-gray-500">
            {" "}
            — draw the next round once all results are in.
          </span>
        </div>
        <button
          type="button"
          onClick={handleDraw}
          disabled={drawing || !allResultsIn}
          data-testid="draw-next-round"
          className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {drawing ? "Drawing…" : "Draw Next Round"}
        </button>
      </div>

      {!allResultsIn && !error && (
        <p className="mt-2 text-xs text-gray-500">
          Waiting for all results in the current round.
        </p>
      )}

      {notice && (
        <p
          className="mt-2 text-sm font-medium text-amber-800"
          role="status"
          data-testid="draw-notice"
        >
          {notice}
        </p>
      )}

      {error && (
        <p
          className="mt-2 text-sm font-medium text-red-700"
          role="alert"
          data-testid="draw-error"
        >
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Build the director-facing message for a completed draw: confirm the round,
 * note who has the bye, and flag any unavoidable repeat or stationary conflict
 * so the director can adjust the seating by hand if they wish.
 */
function describeDraw(result: SwissDrawAck): string {
  const parts: string[] = [`Round ${result.roundNumber} drawn.`];

  if (result.sitOutPairId != null) {
    parts.push("One pair sits out this round (bye).");
  }
  if (result.hadUnavoidableRepeat) {
    parts.push(
      "A repeat pairing couldn't be avoided — review the seating if you wish.",
    );
  }
  if (result.hadStationaryConflict) {
    parts.push(
      "Two stationary pairs had to meet — review the seating if you wish.",
    );
  }

  return parts.join(" ");
}
