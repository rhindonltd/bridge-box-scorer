import { NextResponse } from "next/server";
import { z } from "zod";

import { withDirectorRoute } from "@/lib/api/directorRoute";
import { success } from "@/lib/api/success";
import { respondToActionError } from "@/lib/api/client-error";
import { renameSection } from "@/db/games/actions/rename-section";
import { deleteSection } from "@/db/games/actions/delete-section";
import { broadcastSections } from "@/socket/broadcast/section-broadcast";

const renameSchema = z.object({ label: z.string().min(1) });

/**
 * PATCH /api/games/[gameId]/sections/[section] — rename a section's label.
 */
export const PATCH = withDirectorRoute(
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
export const DELETE = withDirectorRoute(async ({ gameId, section }) => {
  if (!section) {
    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 },
    );
  }

  try {
    await deleteSection(gameId, section);
    await broadcastSections(gameId);
    return success({});
  } catch (err) {
    return respondToActionError(
      err,
      `Failed to delete section ${section} in game ${gameId}:`,
    );
  }
});
