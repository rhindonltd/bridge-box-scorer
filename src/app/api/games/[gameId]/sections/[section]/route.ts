import { NextResponse } from "next/server";
import { z } from "zod";

import { withDirectorRoute } from "@/lib/api/directorRoute";
import { success } from "@/lib/api/success";
import { renameSection } from "@/db/games/actions/rename-section";
import { deleteSection } from "@/db/games/actions/delete-section";
import { broadcastSections } from "@/socket/broadcast/section-broadcast";
import { sectionFromUrl } from "@/lib/api/section-param";

const renameSchema = z.object({ label: z.string().min(1) });

/**
 * PATCH /api/games/[gameId]/sections/[section] — rename a section's label.
 */
export const PATCH = withDirectorRoute(async ({ gameId, req }) => {
  const section = sectionFromUrl(req.url);
  const parsed = renameSchema.safeParse(await req.json().catch(() => null));
  if (!section || !parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 },
    );
  }

  try {
    await renameSection(gameId, section, parsed.data.label);
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 400 },
    );
  }

  await broadcastSections(gameId);
  return success({});
});

/**
 * DELETE /api/games/[gameId]/sections/[section] — remove a section.
 */
export const DELETE = withDirectorRoute(async ({ gameId, req }) => {
  const section = sectionFromUrl(req.url);
  if (!section) {
    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 },
    );
  }

  try {
    await deleteSection(gameId, section);
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 400 },
    );
  }

  await broadcastSections(gameId);
  return success({});
});
