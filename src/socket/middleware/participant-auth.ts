import { timingSafeEqual } from "node:crypto";
import { findParticipantSecret } from "@/db/games/queries/find-participant-secret";

/**
 * Constant-time comparison of two secrets. Returns false immediately when the
 * byte lengths differ (timingSafeEqual requires equal-length buffers), so the
 * length check does not leak beyond "wrong length".
 */
function secretsMatch(supplied: string, stored: string): boolean {
  const a = Buffer.from(supplied);
  const b = Buffer.from(stored);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Validates a player token for a specific seat in a game.
 *
 * Each player-initiated socket event includes a `token` field in its payload —
 * the secret key issued to that seat at join time (see create-participant). This
 * function looks up the stored secret for `seat` and compares it, in constant
 * time, with the supplied token.
 *
 * Returns true if the token matches the seat's stored secret.
 */
export async function validatePlayerToken(
  gameId: string,
  seat: string,
  token: string | undefined | null,
): Promise<boolean> {
  if (!token) return false;

  try {
    const secret = await findParticipantSecret(gameId, seat);
    if (!secret) return false;
    return secretsMatch(token, secret);
  } catch {
    return false;
  }
}

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
  cb?: (response: { success: false; error: string }) => void,
): Promise<boolean> {
  if (await validatePlayerToken(gameId, seat, token)) return true;

  console.warn(
    `Rejected player mutation: invalid token for seat ${seat} in game ${gameId}`,
  );
  cb?.({ success: false, error: "Unauthorized" });
  return false;
}
