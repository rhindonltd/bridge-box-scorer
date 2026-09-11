import { z } from "zod";

import { withBasicRoute } from "@/lib/api/basicRoute";
import { ClientError, respondToActionError } from "@/lib/api/client-error";
import { success } from "@/lib/api/success";
import { validateAndClaimShareCode } from "@/db/system/queries/validate-share-code";
import { createLoginSession } from "@/db/system/actions/create-login-session";

const bodySchema = z.object({
  code: z.string().min(1),
});

/**
 * POST /api/director-codes/claim — claim a director share code.
 *
 * No auth: the whole point is that the caller has no director token yet. The
 * code itself is the credential — it resolves the game and, when valid, mints a
 * director login session which the client stores. An invalid, expired, or
 * already-used code is a client error (400 with the reason); infra failures
 * → 500.
 *
 * Returns the new director token plus the resolved gameId so the client knows
 * which game it now directs.
 */
export const POST = withBasicRoute(async ({ req }) => {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));

  try {
    if (!parsed.success) {
      throw new ClientError("Invalid share code");
    }

    const result = await validateAndClaimShareCode(parsed.data.code);

    if (!result.valid) {
      throw new ClientError(result.error);
    }

    const directorToken = crypto.randomUUID();
    await createLoginSession({
      token: directorToken,
      gameId: result.gameId,
      role: "DIRECTOR",
    });

    return success({ directorToken, gameId: result.gameId });
  } catch (err) {
    return respondToActionError(err, "Failed to claim director code:");
  }
});
