"use client";

import { useState } from "react";
import {
  previewNextSwissTeamsRound,
  commitNextSwissTeamsRound,
  type SwissTeamsPreviewAck,
  type TeamsMatchEntry,
  type TeamsTriangleEntry,
} from "@/lib/swiss-service";
import { SwissTeamsDrawPreview } from "./SwissTeamsDrawPreview";

/**
 * Director control for drawing the next Swiss Teams round, shown on the in-play
 * Movement screen for a Swiss Teams section.
 *
 * The button is enabled only when every result for the current round is in
 * (`allResultsIn`). Drawing first PREVIEWS the proposed round: the control
 * swaps to a full-screen review ({@link SwissTeamsDrawPreview}) showing the
 * matches (with team names) and any bye or triangle. Only when the director
 * taps OK is the round committed and broadcast; Cancel discards it (nothing is
 * written).
 *
 * The director may hand-adjust the draw first (tap two teams to swap their
 * places); OK commits exactly the arrangement shown, edited or not.
 */
export function SwissTeamsDrawControl({
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
  const [preview, setPreview] = useState<SwissTeamsPreviewAck | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handlePreview() {
    setPreviewing(true);
    setError(null);
    setNotice(null);
    try {
      const result = await previewNextSwissTeamsRound(gameId, section);
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
    matches: TeamsMatchEntry[],
    byeTeamId: number | null,
    triangle: TeamsTriangleEntry | null,
  ) {
    if (!preview) return;
    setCommitting(true);
    setError(null);
    try {
      const result = await commitNextSwissTeamsRound(
        gameId,
        section,
        matches,
        byeTeamId,
        triangle,
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
      <SwissTeamsDrawPreview
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
          <span className="font-semibold">Swiss Teams</span>
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
