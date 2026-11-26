import { findLoginSession } from "@/db/system/queries/find-login-session";

/**
 * Validates a director token for a specific game.
 *
 * Director-only socket events and HTTP routes carry a director token. This
 * function verifies the token exists in the DB, is a DIRECTOR
 * session, and is bound to exactly this gameId.
 *
 * Director sessions are always created with a concrete gameId (game creation
 * and share-code claim both pass one), so the token must match this game
 * exactly. We intentionally do NOT treat a null-gameId session as a
 * "global director" — that would let one token control every game, which no
 * legitimate flow issues.
 *
 * Returns true if the token is a DIRECTOR session for the given game.
 */
export function validateDirectorToken(
  directorToken: string | undefined | null,
  gameId: string,
): boolean {
  if (!directorToken) return false;

  try {
    const session = findLoginSession(directorToken);
    if (!session) return false;
    if (session.role !== "DIRECTOR") return false;
    // Token must be bound to exactly this game.
    if (session.gameId !== gameId) return false;
    return true;
  } catch {
    return false;
  }
}
