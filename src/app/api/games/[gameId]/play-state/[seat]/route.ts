import { NextResponse } from "next/server";
import { resolvePlayState } from "@/services/resolve-play-state";
import { withGameRoute } from "@/lib/api/gameRoute";
import { success } from "@/lib/api/success";

/**
 * GET /api/games/[gameId]/play-state/[seat] — the server-resolved play state
 * for a seated player: their current round (with its boards, players and
 * per-board statuses), their reconstructed position within that round, and the
 * between-rounds verdict (next round / awaiting the director's draw / event
 * complete). Reconstructed from durable truth so it survives the player
 * leaving and returning. 404 when the seat has no assignment yet (game not
 * started / no movement chosen).
 */
export const GET = withGameRoute(async ({ db, gameId, seat }) => {
  const result = await resolvePlayState(db, gameId, seat!);
  if (!result) {
    return NextResponse.json(
      { success: false, error: "Play state not found" },
      { status: 404 },
    );
  }

  return success(result);
});
