import { NextResponse } from "next/server";
import { isGameFinalised } from "@/db/game-index/queries/is-game-finalised";
import {
  FINALISED_MESSAGE,
  NOT_FINALISED_MESSAGE,
} from "@/lib/finalised-message";

/**
 * HTTP guard for routes that expose a game's FINAL results (downloads,
 * uploads). Returns a 403 response until the director has finalised the game,
 * or null when the request may proceed.
 */
export async function requireFinalisedGuard(
  gameId: string,
): Promise<NextResponse | null> {
  if (await isGameFinalised(gameId)) return null;
  return NextResponse.json(
    { success: false, error: NOT_FINALISED_MESSAGE },
    { status: 403 },
  );
}

/**
 * HTTP guard for routes that change a game. Returns a 409 response when the
 * game is finalised (read-only), or null when the change may proceed:
 *
 *   const blocked = await finalisedGuard(gameId);
 *   if (blocked) return blocked;
 */
export async function finalisedGuard(
  gameId: string,
): Promise<NextResponse | null> {
  if (await isGameFinalised(gameId)) {
    return NextResponse.json(
      { success: false, error: FINALISED_MESSAGE },
      { status: 409 },
    );
  }
  return null;
}
