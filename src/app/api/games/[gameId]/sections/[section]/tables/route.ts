import { NextResponse } from "next/server";
import { z } from "zod";

import { withDirectorRoute } from "@/lib/api/directorRoute";
import { success } from "@/lib/api/success";
import { respondToActionError } from "@/lib/api/client-error";
import { updateSectionTables } from "@/db/games/actions/update-section-tables";
import { findSections } from "@/db/games/queries/find-sections";
import { broadcastSections } from "@/socket/broadcast/section-broadcast";

const bodySchema = z.object({ tables: z.number().int().min(1) });

/**
 * PUT /api/games/[gameId]/sections/[section]/tables — set a section's table
 * count. The per-section shrink guard (rejecting a reduction below a seated
 * table) lives in `updateSectionTables` and surfaces as a 400.
 */
export const PUT = withDirectorRoute(
  async ({ gameId, db, section, body }) => {
    if (!section) {
      return NextResponse.json(
        { success: false, error: "Invalid request" },
        { status: 400 },
      );
    }

    const sections = await findSections(db);
    if (!sections.some((s) => s.section === section)) {
      return NextResponse.json(
        { success: false, error: `Section ${section} not found` },
        { status: 404 },
      );
    }

    try {
      await updateSectionTables(gameId, section, body.tables);
      await broadcastSections(gameId);
      return success({});
    } catch (err) {
      return respondToActionError(
        err,
        `Failed to update tables for section ${section} in game ${gameId}:`,
      );
    }
  },
  { bodySchema },
);
