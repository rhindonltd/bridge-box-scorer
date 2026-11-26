import { validatePlayerToken } from "@/services/security/player-token";
import { logger } from "@/lib/log";
import { rejectUnauthorized, UnauthorizedCallback } from "./auth-guard";

/**
 * Guard for player-initiated socket event handlers.
 *
 * Validates the `token` from the event payload against the seat's stored
 * secret. Returns true if authorised; returns false and invokes the callback
 * with an error if not. On rejection it also logs a warning naming the game and
 * seat (never the token value) for director diagnostics.
 */
export async function assertPlayer(
  gameId: string,
  seat: string,
  token: string | undefined | null,
  cb?: UnauthorizedCallback,
): Promise<boolean> {
  if (await validatePlayerToken(gameId, seat, token)) return true;

  // Log the game/seat (never the token value) for director diagnostics.
  logger.warn({ gameId, seat }, "Rejected player mutation: invalid token");
  return rejectUnauthorized(cb);
}
