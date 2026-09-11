import { getDirectorToken } from "@/lib/director-token";
import type { BreakConfig } from "@/timer/timer-state";

/** The domain fields that describe a section's timer configuration. */
export interface TimerConfigFields {
  boardsPerRound: number;
  totalRounds: number;
  playDuration: number;
  moveDuration: number;
  warningSeconds?: number;
  breaks?: BreakConfig[];
}

/**
 * Save a section's timer configuration during game setup (director-only). This
 * persists a "configured but not started" timer state and broadcasts it, but
 * never starts the timer.
 *
 * Callers use this as a fire-and-forget auto-save (including from an unmount
 * flush), so the returned promise resolves on success and rejects with the
 * server's error message on failure — the caller decides whether to await it.
 */
export async function saveTimerConfig(
  gameId: string,
  section: string,
  fields: TimerConfigFields,
): Promise<void> {
  const res = await fetch(
    `/api/games/${gameId}/sections/${encodeURIComponent(section)}/timer/config`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-director-token": getDirectorToken(gameId) ?? "",
      },
      body: JSON.stringify(fields),
    },
  );

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? "Failed to save timer config");
  }
}
