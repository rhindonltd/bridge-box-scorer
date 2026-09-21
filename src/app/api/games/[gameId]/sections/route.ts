import { z } from "zod";

import { withGameRoute } from "@/lib/api/gameRoute";
import { withDirectorRoute } from "@/lib/api/directorRoute";
import { success } from "@/lib/api/success";
import { respondToActionError } from "@/lib/api/client-error";
import { createSection } from "@/db/games/actions/create-section";
import { findSections } from "@/db/games/queries/find-sections";
import { parseSelectedMovement } from "@/model/selected-movement";
import { broadcastSections } from "@/socket/broadcast/section-broadcast";

/**
 * GET /api/games/[gameId]/sections — list the game's sections with each
 * section's selected movement parsed into the typed SelectedMovement shape
 * (null when none chosen). Not director-gated: every client in the game reads
 * this to render the section-scoped setup screens.
 */
export const GET = withGameRoute(async ({ db }) => {
  const rows = await findSections(db);
  const sections = rows.map((s) => ({
    section: s.section,
    label: s.label,
    tables: s.tables,
    ordinal: s.ordinal,
    selectedMovement: parseSelectedMovement(s.selectedMovement),
  }));
  return success({ sections });
});

const bodySchema = z.object({
  section: z.string().min(1),
  label: z.string().min(1).optional(),
  tables: z.number().int().min(1),
});

/**
 * POST /api/games/[gameId]/sections — add a section (director-only).
 * Broadcasts the updated section list game-wide.
 */
export const POST = withDirectorRoute(
  async ({ gameId, body }) => {
    const { section, label, tables } = body;

    try {
      await createSection(gameId, { section, label, tables });
      await broadcastSections(gameId);
      return success({});
    } catch (err) {
      return respondToActionError(
        err,
        `Failed to create section in game ${gameId}:`,
      );
    }
  },
  { bodySchema },
);
