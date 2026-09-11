import { NextResponse } from "next/server";
import { z } from "zod";

import { withDirectorRoute } from "@/lib/api/directorRoute";
import { success } from "@/lib/api/success";
import { createSection } from "@/db/games/actions/create-section";
import { broadcastSections } from "@/socket/broadcast/section-broadcast";

const bodySchema = z.object({
  section: z.string().min(1),
  label: z.string().min(1).optional(),
  tables: z.number().int().min(1),
});

/**
 * POST /api/games/[gameId]/sections — add a section (director-only).
 * Broadcasts the updated section list game-wide.
 */
export const POST = withDirectorRoute(async ({ gameId, req }) => {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 },
    );
  }

  const { section, label, tables } = parsed.data;

  try {
    await createSection(gameId, { section, label, tables });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 400 },
    );
  }

  await broadcastSections(gameId);
  return success({});
});
