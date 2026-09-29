"use client";

import type { SwissTeamsPreviewAck } from "@/lib/swiss-service";

const primaryButtonClass =
  "w-full py-3.5 text-lg font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50";

const secondaryButtonClass =
  "w-full py-3.5 text-lg font-semibold bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50";

export interface SwissTeamsDrawPreviewProps {
  preview: SwissTeamsPreviewAck;
  /** True while the commit request is in flight. */
  committing: boolean;
  /** Inline error from a failed commit, if any. */
  error: string | null;
  /** Accept the drawn round. */
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Full-screen review of a freshly-drawn Swiss Teams round before it is
 * committed. Shows each match as the two teams meeting, the sit-out (bye) team,
 * or the three-way triangle, plus a repeat advisory. OK commits the round as
 * shown; Cancel discards it (nothing was written).
 *
 * This is read-only for now — the director cannot yet edit a teams draw. The
 * component takes the whole preview and reports OK/Cancel, so editing controls
 * (swap teams, reassign the bye/triangle) can be layered on later without
 * changing how it is hosted.
 */
export function SwissTeamsDrawPreview({
  preview,
  committing,
  error,
  onConfirm,
  onCancel,
}: SwissTeamsDrawPreviewProps) {
  const { named } = preview;

  return (
    <div
      className="flex h-full min-h-0 flex-col"
      data-testid="swiss-teams-draw-preview"
    >
      <div className="shrink-0 border-b border-gray-200 bg-gray-100 px-4 py-3 text-center font-semibold text-gray-800">
        Round {preview.roundNumber} — review draw
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl px-4 pb-4 pt-4">
          <p className="mb-3 text-sm text-gray-600">
            Review the team matches for round {preview.roundNumber}. Each match
            is played in two rooms — the away pairs travel to their opponents.
            Nothing is saved until you tap OK.
          </p>

          {preview.hadUnavoidableRepeat && (
            <div
              className="mb-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800"
              role="status"
              data-testid="draw-advisories"
            >
              A match repeats an earlier-round opponent (no repeat-free draw was
              possible). You can accept it or draw again.
            </div>
          )}

          <div className="flex flex-col gap-3">
            {named.matches.map((m) => (
              <div
                key={`${m.a.teamId}-${m.b.teamId}`}
                className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
                data-testid="teams-match"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-base font-semibold text-gray-800">
                    {m.a.name}
                  </span>
                  <span className="text-sm text-gray-400">v</span>
                  <span className="text-base font-semibold text-gray-800">
                    {m.b.name}
                  </span>
                </div>
              </div>
            ))}

            {named.triangle && (
              <div
                className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
                data-testid="teams-triangle"
              >
                <div className="mb-1 text-sm font-semibold text-gray-500">
                  Three-way (triangle)
                </div>
                <div className="text-base text-gray-800">
                  {named.triangle.a.name}, {named.triangle.b.name},{" "}
                  {named.triangle.c.name}
                </div>
              </div>
            )}

            {named.bye && (
              <div
                className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-3"
                data-testid="teams-bye"
              >
                <div className="text-sm font-semibold text-gray-500">
                  Sitting out (bye)
                </div>
                <div className="text-base text-gray-800">{named.bye.name}</div>
              </div>
            )}
          </div>

          {error && (
            <p
              className="mt-3 text-sm font-medium text-red-700"
              role="alert"
              data-testid="draw-error"
            >
              {error}
            </p>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-gray-200 p-2">
        <div className="mx-auto flex w-full max-w-2xl gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={committing}
            className={secondaryButtonClass}
            data-testid="draw-cancel"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={committing}
            className={primaryButtonClass}
            data-testid="draw-confirm"
          >
            {committing ? "Saving…" : "OK"}
          </button>
        </div>
      </div>
    </div>
  );
}
