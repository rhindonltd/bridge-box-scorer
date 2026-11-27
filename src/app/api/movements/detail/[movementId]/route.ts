import { NextResponse } from "next/server";
import { withBasicRoute } from "@/lib/api/basicRoute";
import { success } from "@/lib/api/success";
import { getMovementDetail } from "@/modules/movement-catalog/server";

/**
 * GET /api/movements/detail/[id]
 *
 * Returns full movement details (tables with rounds) for a stored pair
 * movement. The client uses this to display the movement in both "by table"
 * and "by round" views.
 *
 * Rounds store only a board-set index; board numbers for the preview are
 * computed from the spec's default boards-per-round.
 *
 * Response shape:
 * {
 *   name,
 *   tables: [{ tableNumber, rounds: [{ roundNumber, ns/ew, boardStart, boardEnd }] }]
 * }
 */
export const GET = withBasicRoute<{ movementId: string }>(
  async ({ params }) => {
    const movementIdNo = Number(params.movementId);
    if (isNaN(movementIdNo) || movementIdNo < 1) {
      return NextResponse.json(
        { success: false, error: "Invalid movement ID" },
        { status: 400 },
      );
    }
    // Unexpected query failures fall through to withBasicRoute's try/catch →
    // 500. The explicit 400/404 branches are part of the endpoint contract and
    // return directly.
    const detail = await getMovementDetail(movementIdNo);
    if (!detail) {
      return NextResponse.json(
        { success: false, error: "Movement not found" },
        { status: 404 },
      );
    }
    return success(detail);
  },
);
