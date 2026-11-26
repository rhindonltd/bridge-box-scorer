import { validateDirectorToken } from "@/services/security/director-token";
import { rejectUnauthorized, UnauthorizedCallback } from "./auth-guard";

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
  cb?: UnauthorizedCallback,
): boolean {
  if (validateDirectorToken(directorToken, gameId)) return true;

  return rejectUnauthorized(cb);
}
