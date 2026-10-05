"use client";

import { useState } from "react";
import {
  previewNextSwissRound,
  commitNextSwissRound,
  type SwissPreviewAck,
} from "@/lib/swiss-service";
import type {
  SwissHalfMatchSeating,
  SwissPairId,
  SwissSeating,
} from "@/movement/swiss/swiss-pairing";
import { SwissDrawPreview } from "./SwissDrawPreview";

/**
 * Director control for drawing the next Swiss Pairs round, shown on the in-play
 * Movement screen for a Swiss section.
 *
 * The button is enabled only when every result for the current round is in
 * (`allResultsIn`). Drawing first PREVIEWS the proposed round: the control
 * swaps to a full-screen review ({@link SwissDrawPreview}) showing the seating
 * with player names and any advisories, where the director can hand-adjust
 * before accepting. Only when they tap OK is the round committed and broadcast;
 * Cancel discards it (nothing is written). This replaces the old commit-on-click
 * behaviour so a director always confirms the seating first.
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
  const [previewing, setPreviewing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [preview, setPreview] = useState<SwissPreviewAck | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handlePreview() {
    setPreviewing(true);
    setError(null);
    setNotice(null);
    try {
      const result = await previewNextSwissRound(gameId, section);
      setPreview(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not draw the next round.",
      );
    } finally {
      setPreviewing(false);
    }
  }

  async function handleConfirm(
    seating: SwissSeating[],
    sitOutPairId: SwissPairId | null,
    halfMatch: SwissHalfMatchSeating | null,
  ) {
    setCommitting(true);
    setError(null);
    try {
      const result = await commitNextSwissRound(
        gameId,
        section,
        seating,
        sitOutPairId,
        halfMatch,
      );
      setPreview(null);
      setNotice(`Round ${result.roundNumber} drawn.`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save the draw.",
      );
    } finally {
      setCommitting(false);
    }
  }

  function handleCancel() {
    setPreview(null);
    setError(null);
  }

  // While a preview is open, take over the screen with the review page.
  if (preview) {
    return (
      <SwissDrawPreview
        preview={preview}
        committing={committing}
        error={error}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    );
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
          onClick={handlePreview}
          disabled={previewing || !allResultsIn}
          data-testid="draw-next-round"
          className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {previewing ? "Drawing…" : "Draw Next Round"}
        </button>
      </div>

      {!allResultsIn && !error && (
        <p className="mt-2 text-xs text-gray-500">
          Waiting for all results in the current round.
        </p>
      )}

      {notice && (
        <p
          className="mt-2 text-sm font-medium text-green-800"
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
