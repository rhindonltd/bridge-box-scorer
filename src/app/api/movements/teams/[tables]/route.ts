import { NextResponse } from "next/server";
import { z } from "zod";
import { listTeamMovements } from "@/modules/movement-catalog/server";
import { withBasicRoute } from "@/lib/api/basicRoute";
import { success } from "@/lib/api/success";

const tablesSchema = z.coerce.number().int().min(1);

/**
 * GET /api/movements/teams/[tables]
 *
 * The stored teams movements for a team count (one table per team) that the
 * app can run, for the movement picker of a Teams game.
 */
export const GET = withBasicRoute<{ tables: string }>(async ({ params }) => {
  const parsed = tablesSchema.safeParse(params.tables);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid table count" },
      { status: 400 },
    );
  }
  // Query failures fall through to withBasicRoute's try/catch → 500.
  return success(await listTeamMovements(parsed.data));
});
