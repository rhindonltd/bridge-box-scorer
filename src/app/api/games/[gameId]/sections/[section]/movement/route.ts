import { NextResponse } from "next/server";
import { z } from "zod";

import { withDirectorRoute } from "@/lib/api/directorRoute";
import { success } from "@/lib/api/success";
import { setSectionMovement } from "@/db/games/actions/set-section-movement";
import { getSectionMovement } from "@/db/games/queries/get-section-movement";
import { getDb } from "@/db/games";
import { broadcastSectionMovementChanged } from "@/socket/broadcast/section-broadcast";
import { sectionFromUrl } from "@/lib/api/section-param";
import { SelectedMovement } from "@/model/selected-movement";
import { mitchellSpecSchema } from "@/model/selected-movement";

const bodySchema = z.object({
  id: z.number().int().positive().optional(),
  boardsPerRound: z.number().int().positive().optional(),
  mitchell: mitchellSpecSchema.optional(),
});

/**
 * PUT /api/games/[gameId]/sections/[section]/movement — set (or clear) the
 * section's movement. A `mitchell` spec, a spec `id` + `boardsPerRound`, or an
 * empty body (clear) are accepted. On an actual change, the section's timer is
 * cleared (its round structure is derived from the movement).
 */
export const PUT = withDirectorRoute(async ({ gameId, req }) => {
  const section = sectionFromUrl(req.url);
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!section || !parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 },
    );
  }

  const { id, boardsPerRound, mitchell } = parsed.data;

  let selected: SelectedMovement | null;
  if (mitchell) {
    selected = { source: "MITCHELL", mitchell };
  } else if (id != null) {
    if (boardsPerRound == null) {
      return NextResponse.json(
        { success: false, error: "No boards per round specified" },
        { status: 400 },
      );
    }
    selected = { source: "SPEC", specId: id, boardsPerRound };
  } else {
    // No movement specified clears the section's selection.
    selected = null;
  }

  try {
    // Read the previous selection first so the broadcaster only clears the
    // timer when the movement actually changed.
    const db = await getDb(gameId);
    const previous = db ? await getSectionMovement(db, section) : null;

    await setSectionMovement(gameId, section, selected);

    await broadcastSectionMovementChanged(gameId, section, previous, selected);
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 400 },
    );
  }

  return success({});
});
