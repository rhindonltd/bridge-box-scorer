import { withDirectorRoute } from "@/lib/api/directorRoute";
import { success } from "@/lib/api/success";
import { respondToActionError } from "@/lib/api/client-error";
import { createShareCode } from "@/db/system/actions/create-share-code";

/**
 * POST /api/games/[gameId]/share-code — the current director mints a short,
 * single-use share code that a co-director can claim from another device to
 * gain director access to this game.
 *
 * Director-only (auth via the x-director-token header). The code is returned to
 * the caller only; there is nothing to broadcast. Infra failures → 500.
 */
export const POST = withDirectorRoute(async ({ gameId }) => {
  try {
    const code = await createShareCode(gameId);
    return success({ code });
  } catch (err) {
    return respondToActionError(err, `Failed to generate share code for ${gameId}:`);
  }
});
