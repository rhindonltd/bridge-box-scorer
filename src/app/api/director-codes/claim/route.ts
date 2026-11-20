import { z } from "zod";
import { withBasicRoute } from "@/lib/api/basicRoute";
import { ClientError, respondToActionError } from "@/lib/api/client-error";
import { success } from "@/lib/api/success";
import { validateAndClaimShareCode } from "@/db/system/queries/validate-share-code";
import { verifyAdminKey } from "@/db/system/queries/admin-key";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { createLoginSession } from "@/db/system/actions/create-login-session";
import { NOT_SHARE_CODE_OR_ADMIN_KEY } from "@/lib/director-claim-messages";
import {
  blockedResponse,
  heldSeatsSchema,
  originIdSchema,
  signInFailed,
  signInSucceeded,
} from "@/services/security/sign-in-guard";

const bodySchema = z.object({
  code: z.string().min(1),
  /** The game the caller wants to direct (the admin key needs it). */
  gameId: z.string().min(1),
  /** Seats this device holds, so the director alert can say who it is. */
  seats: heldSeatsSchema,
  /** Lets this device recognise (and not show) its own sign-in alert. */
  originId: originIdSchema,
});

/**
 * POST /api/director-codes/claim — become a director of a game.
 *
 * No auth: the whole point is that the caller has no director token yet. The
 * code is the credential, and it is either:
 *  - a director share code from another director, which names its game; or
 *  - the Bridge Box's admin key, which makes the caller a director of the
 *    requested `gameId`. This is the way back in when the director's device
 *    has died and nobody else can issue a share code.
 *
 * Every attempt is watched: a success alerts that game's other directors, and
 * a third failure from one device within 2 minutes alerts them and blocks the
 * device for 5 minutes (429). The device sends a random `originId`, which the
 * alert carries, so it can skip its own alert.
 */
export const POST = withBasicRoute(async ({ req }) => {
  const blocked = blockedResponse(req);
  if (blocked) return blocked;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  try {
    if (!parsed.success) {
      throw new ClientError("Invalid share code");
    }
    const { code, gameId: requestedGameId, seats, originId } = parsed.data;

    let claim: Awaited<ReturnType<typeof resolveGame>>;
    try {
      claim = await resolveGame(code, requestedGameId);
    } catch (err) {
      if (err instanceof ClientError) {
        await signInFailed(
          req,
          { kind: "game", gameId: requestedGameId },
          seats,
        );
      }
      throw err;
    }

    const directorToken = crypto.randomUUID();
    await createLoginSession({
      token: directorToken,
      gameId: claim.gameId,
      role: "DIRECTOR",
    });
    await signInSucceeded(
      req,
      { kind: "game", gameId: claim.gameId },
      claim.method,
      seats,
      originId,
    );
    return success({ directorToken, gameId: claim.gameId });
  } catch (err) {
    return respondToActionError(err, "Failed to claim director code:");
  }
});

/**
 * The game the code grants director access to, and how: the requested game
 * when the code is the admin key, otherwise the game named by a valid share
 * code. Throws a ClientError with the reason when neither applies.
 */
async function resolveGame(
  code: string,
  requestedGameId: string,
): Promise<{ gameId: string; method: "shareCode" | "adminKey" }> {
  if (await verifyAdminKey(code)) {
    if (!(await findGameById(requestedGameId))) {
      throw new ClientError("Game not found");
    }
    return { gameId: requestedGameId, method: "adminKey" };
  }

  const result = await validateAndClaimShareCode(code);
  if (result.valid) return { gameId: result.gameId, method: "shareCode" };

  // An unknown code could have been a mistyped admin key, so say so.
  throw new ClientError(
    result.error === "Invalid code"
      ? NOT_SHARE_CODE_OR_ADMIN_KEY
      : result.error,
  );
}
