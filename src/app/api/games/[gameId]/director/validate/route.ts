import { withDirectorRoute } from "@/lib/api/directorRoute";
import { success } from "@/lib/api/success";

/**
 * GET /api/games/[gameId]/director/validate
 *
 * Confirms that the `x-director-token` header is a valid DIRECTOR session for
 * this game. `withDirectorRoute` does the check: it returns 401 for a missing,
 * stale, or wrong-game token and only invokes this handler when the token is
 * valid for this game.
 *
 * The manage UI calls this on load so it doesn't trust the mere presence of a
 * `director:<gameId>` token in localStorage — a stale or bogus value would
 * otherwise let someone into the manage screens (whose actions then all fail
 * server-side).
 */
export const GET = withDirectorRoute(async () => {
  return success({ valid: true });
});
