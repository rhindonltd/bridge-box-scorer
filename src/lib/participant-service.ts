import { getDirectorToken } from "@/lib/director-token";
import type { Seat } from "@/model/participants";

/**
 * Director-only participant management over HTTP. The director token travels in
 * the `x-director-token` header; the server broadcasts the resulting participant
 * list. Throws with the server's error message on failure so callers can
 * surface it.
 */
export async function evictParticipant(
  gameId: string,
  seat: Seat,
): Promise<void> {
  const res = await fetch(
    `/api/games/${gameId}/participants/${encodeURIComponent(seat)}`,
    {
      method: "DELETE",
      headers: { "x-director-token": getDirectorToken(gameId) ?? "" },
    },
  );

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? "Failed to evict participant");
  }
}
