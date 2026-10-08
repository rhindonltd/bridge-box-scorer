import { getDirectorToken } from "@/lib/director-token";
import type { SectionMismatchCandidate } from "@/services/detect-swiss-mismatch-service";

/**
 * Director-only §3.5 mismatch candidate fetch. Like the section-management
 * calls this goes over HTTP with the director token in the `x-director-token`
 * header (not the socket): it is a one-shot read with no live push. The caller
 * reviews each candidate and, on confirm, emits `traveller:markMismatch` to
 * apply the §3.5.2 adjustment.
 */
export async function fetchMismatchCandidates(
  gameId: string,
  section: string,
): Promise<SectionMismatchCandidate[]> {
  const res = await fetch(
    `/api/games/${gameId}/mismatch-candidates?section=${encodeURIComponent(section)}`,
    {
      method: "GET",
      headers: { "x-director-token": getDirectorToken(gameId) ?? "" },
    },
  );

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? "Failed to load mismatch candidates");
  }

  const data = await res.json();
  return data.result.candidates as SectionMismatchCandidate[];
}
