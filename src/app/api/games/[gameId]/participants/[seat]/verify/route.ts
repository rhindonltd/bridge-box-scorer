import { NextResponse } from "next/server";

import { withGameRoute } from "@/lib/api/gameRoute";
import { success } from "@/lib/api/success";
import { validatePlayerToken } from "@/socket/middleware/participant-auth";
import { isPairSeat, type Seat } from "@/model/participants";

/**
 * GET /api/games/[gameId]/participants/[seat]/verify — does THIS device still
 * hold the given seat?
 *
 * A device remembers its seat + secret in localStorage after seating. That
 * memory can go stale — the director may have evicted the pair, or the seat was
 * re-seated on another device — so before a rejoin routes straight to the play
 * screen, the client calls this to confirm the seat is still its own. The
 * secret travels in the `x-player-token` header (never the URL); the check
 * reuses the same constant-time seat+token comparison the socket handlers use.
 *
 * Returns `{ held: boolean }`. Not an auth gate itself — a `false` is a normal
 * answer (clear the token, pick a seat again), not a 401.
 */
export const GET = withGameRoute(async ({ gameId, seat, req }) => {
  if (!seat || !isPairSeat(seat as Seat)) {
    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 },
    );
  }

  const token = req.headers.get("x-player-token");
  const held = await validatePlayerToken(gameId, seat, token);

  return success({ held });
});
