import { NextResponse } from "next/server";
import {
  getPairMovement,
  getTeamMovement,
} from "@/db/movements/queries/get-movement";

/**
 * GET /api/movements/detail/[type]/[id]
 *
 * Returns full movement details (tables with rounds) for a given movement spec.
 * The client uses this to display the movement in both "by table" and "by round" views.
 *
 * Response shape:
 * {
 *   tables: [{ tableNumber, rounds: [{ roundNumber, ns/ew, boardStart, boardEnd }] }]
 * }
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ movementType: string; movementId: string }> },
) {
  const { movementType, movementId } = await params;

  const movementIdNo = Number(movementId);

  if (isNaN(movementIdNo) || movementIdNo < 1) {
    return NextResponse.json(
      { success: false, error: "Invalid movement ID" },
      { status: 400 },
    );
  }

  try {
    let tables;

    switch (movementType) {
      case "PAIRS":
        tables = await getPairMovement(movementIdNo);
        break;
      case "TEAMS":
        tables = await getTeamMovement(movementIdNo);
        break;
      default:
        return NextResponse.json(
          { success: false, error: `Unknown movement type: ${movementType}` },
          { status: 400 },
        );
    }

    return NextResponse.json({
      success: true,
      result: { type: movementType, tables },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
