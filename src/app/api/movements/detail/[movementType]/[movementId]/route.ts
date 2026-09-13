import { NextResponse } from "next/server";
import { withBasicRoute } from "@/lib/api/basicRoute";
import { success } from "@/lib/api/success";
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
 *   type,
 *   name,
 *   tables: [{ tableNumber, rounds: [{ roundNumber, ns/ew, boardStart, boardEnd }] }]
 * }
 */
export const GET = withBasicRoute<{
  movementType: string;
  movementId: string;
}>(async ({ params }) => {
  const { movementType, movementId } = params;

  const movementIdNo = Number(movementId);

  if (isNaN(movementIdNo) || movementIdNo < 1) {
    return NextResponse.json(
      { success: false, error: "Invalid movement ID" },
      { status: 400 },
    );
  }

  // Unexpected query failures fall through to withBasicRoute's try/catch → 500.
  // The explicit 400/404 branches below are part of the endpoint contract and
  // return directly.
  let tables: MovementByTable[];
  let name: string;

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
      name = spec.name;
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
      name = spec.name;
      break;
    }
    default:
      return NextResponse.json(
        { success: false, error: `Unknown movement type: ${movementType}` },
        { status: 400 },
      );
  }

  return success({ type: movementType, name, tables });
});

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
