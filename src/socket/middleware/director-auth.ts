import { findLoginSession } from "@/db/system/queries/find-login-session";

/**
 * Validates a director token for a specific game.
 *
 * Each director-only socket event includes a `directorToken` field in its
 * payload. This function verifies the token exists in the DB and is associated
 * with the correct gameId.
 *
 * Returns true if the token is valid for the given game.
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
    // Token must be for this specific game
    if (session.gameId !== null && session.gameId !== gameId) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Guard for director-only socket event handlers.
 *
 * Validates the directorToken from the event payload against the gameId.
 * Returns true if authorised; returns false and invokes the callback with
 * an error if not.
 */
export function assertDirector(
  directorToken: string | undefined | null,
  gameId: string,
  cb?: (response: { success: false; error: string }) => void,
): boolean {
  if (validateDirectorToken(directorToken, gameId)) return true;

  cb?.({ success: false, error: "Unauthorized" });
  return false;
}
