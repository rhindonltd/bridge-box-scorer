import { NextResponse } from "next/server";
import {
  getPairMovement,
  getTeamMovement,
  PairMovement,
  TeamMovement,
} from "@/db/movements/queries/get-movement";
import {
  getPairMovementSpecById,
  getTeamMovementSpecById,
} from "@/db/movements/queries/get-movement-spec";
import { boardRangeForSet } from "@/movement/shared";
import { MovementByTable } from "@/movement/movementData";

/**
 * GET /api/movements/detail/[type]/[id]
 *
 * Returns full movement details (tables with rounds) for a given movement spec.
 * The client uses this to display the movement in both "by table" and "by round" views.
 *
 * Rounds store only a board-set index; board numbers for the preview are
 * computed from the spec's default boards-per-round.
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
    let tables: MovementByTable[];

    switch (movementType) {
      case "PAIRS": {
        const [movement, spec] = await Promise.all([
          getPairMovement(movementIdNo),
          getPairMovementSpecById(movementIdNo),
        ]);
        if (!spec) {
          return NextResponse.json(
            { success: false, error: "Movement not found" },
            { status: 404 },
          );
        }
        tables = toMovementByTable(movement, spec.boardsPerRound);
        break;
      }
      case "TEAMS": {
        const [movement, spec] = await Promise.all([
          getTeamMovement(movementIdNo),
          getTeamMovementSpecById(movementIdNo),
        ]);
        if (!spec) {
          return NextResponse.json(
            { success: false, error: "Movement not found" },
            { status: 404 },
          );
        }
        tables = toMovementByTable(movement, spec.boardsPerRound);
        break;
      }
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

/**
 * Expand stored board-set indices into concrete board ranges for the preview,
 * using the given boards-per-round.
 */
function toMovementByTable(
  movement: (PairMovement | TeamMovement)[],
  boardsPerRound: number,
): MovementByTable[] {
  return movement.map((table) => ({
    tableNumber: table.tableNumber,
    rounds: table.rounds.map((round) => ({
      roundNumber: round.roundNumber,
      ns: round.ns,
      ew: round.ew,
      ...boardRangeForSet(round.boardSet, boardsPerRound),
    })),
  }));
}
