import { NextResponse } from "next/server";
import { z } from "zod";

import { withDirectorEditRoute } from "@/lib/api/directorRoute";
import { success } from "@/lib/api/success";
import { respondToActionError } from "@/lib/api/client-error";
import { renameSection } from "@/db/games/actions/rename-section";
import { deleteSection } from "@/db/games/actions/delete-section";
import { broadcastSections } from "@/socket/broadcast/section-broadcast";
import { syncGameTableCount } from "@/services/game-table-count";

const renameSchema = z.object({ label: z.string().min(1) });

/**
 * PATCH /api/games/[gameId]/sections/[section] — rename a section's label.
 */
export const PATCH = withDirectorEditRoute(
  async ({ gameId, section, body }) => {
    if (!section) {
      return NextResponse.json(
        { success: false, error: "Invalid request" },
        { status: 400 },
      );
    }

    try {
      await renameSection(gameId, section, body.label);
      await broadcastSections(gameId);
      return success({});
    } catch (err) {
      return respondToActionError(
        err,
        `Failed to rename section ${section} in game ${gameId}:`,
      );
    }
  },
  { bodySchema: renameSchema },
);

/**
 * DELETE /api/games/[gameId]/sections/[section] — remove a section.
 */
export const DELETE = withDirectorEditRoute(async ({ gameId, section }) => {
  if (!section) {
    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 },
    );
  }

  try {
    await deleteSection(gameId, section);
    await syncGameTableCount(gameId);
    await broadcastSections(gameId);
    return success({});
  } catch (err) {
    return respondToActionError(
      err,
      `Failed to delete section ${section} in game ${gameId}:`,
    );
  }
});
