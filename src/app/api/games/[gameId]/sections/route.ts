import { withGameRoute } from "@/lib/api/gameRoute";
import { success } from "@/lib/api/success";
import { findSections } from "@/db/games/queries/find-sections";
import { parseSelectedMovement } from "@/model/selected-movement";

/**
 * List the game's sections with their per-section selected movement parsed into
 * the typed SelectedMovement shape (null when none chosen).
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
