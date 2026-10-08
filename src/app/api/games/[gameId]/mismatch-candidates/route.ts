import { withDirectorRoute } from "@/lib/api/directorRoute";
import { success } from "@/lib/api/success";
import { NextResponse } from "next/server";
import { detectSectionMismatches } from "@/services/detect-swiss-mismatch-service";
import { SectionLetter } from "@/model/participants";

/**
 * GET /api/games/[gameId]/mismatch-candidates?section=A
 *
 * Director-only (`x-director-token`). Returns the EBU §3.5 mismatch CANDIDATES
 * for a Swiss section: pairs whose committed opponent differs by more than 5
 * current VP from the opponent the CORRECTED draw (re-run on the standings as
 * they stand now, over the earlier rounds only) would have produced after a
 * retroactive score adjustment.
 *
 * This is a one-shot READ with no live push, so it is HTTP (SWR-fetched on the
 * director review screen) rather than a socket event — unlike the mutating
 * `traveller:markMismatch`, which must broadcast. The director reviews each
 * candidate, sets fault, and confirms, which then emits `markMismatch` to apply
 * the §3.5.2 one-sided VP adjustment. A non-Swiss section returns an empty list.
 */
export const GET = withDirectorRoute(async ({ gameId, req }) => {
  const section = new URL(req.url).searchParams.get("section");
  if (!section) {
    return NextResponse.json(
      { success: false, error: "Missing section" },
      { status: 400 },
    );
  }

  const candidates = await detectSectionMismatches(
    gameId,
    section as SectionLetter,
  );
  return success({ candidates });
});
