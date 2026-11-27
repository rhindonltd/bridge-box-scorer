import { NextResponse } from "next/server";
import { withBasicRoute } from "@/lib/api/basicRoute";
import { success } from "@/lib/api/success";
import { getTeamMovementDetail } from "@/modules/movement-catalog/server";

/**
 * GET /api/movements/teams/detail/[id]
 *
 * One stored teams movement laid out by table (home team NS, visiting team EW,
 * board numbers per round), for the movement preview. 404 when no supported
 * teams movement has that id.
 */
export const GET = withBasicRoute<{ movementId: string }>(
  async ({ params }) => {
    const movementIdNo = Number(params.movementId);
    if (!Number.isInteger(movementIdNo) || movementIdNo < 1) {
      return NextResponse.json(
        { success: false, error: "Invalid movement ID" },
        { status: 400 },
      );
    }
    const detail = await getTeamMovementDetail(movementIdNo);
    if (!detail) {
      return NextResponse.json(
        { success: false, error: "Movement not found" },
        { status: 404 },
      );
    }
    return success(detail);
  },
);
