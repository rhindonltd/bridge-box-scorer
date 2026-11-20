import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { withBasicRoute } from "@/lib/api/basicRoute";
import { success } from "@/lib/api/success";
import { verifyAdminKey } from "@/db/system/queries/admin-key";
import { createLoginSession } from "@/db/system/actions/create-login-session";
import {
  blockedResponse,
  heldSeatsSchema,
  originIdSchema,
  signInFailed,
  signInSucceeded,
} from "@/services/security/sign-in-guard";

const verifySchema = z.object({
  key: z.string().min(1),
  /** Seats this device holds, so the director alert can say who it is. */
  seats: heldSeatsSchema,
  /** Lets this device recognise (and not show) its own sign-in alert. */
  originId: originIdSchema,
});

const SETTINGS = { kind: "settings" } as const;

/**
 * POST /api/system/admin-key/verify
 *
 * The one place the admin key is sent to the server to unlock Settings. On a
 * correct key we mint a short-lived ADMIN login session and return its token;
 * the client uses that token (not the key) for subsequent admin/device calls.
 *
 * Every attempt is watched: a success alerts every director device, and a
 * third failure from one device within 2 minutes alerts them and blocks the
 * device for 5 minutes (429). The device sends a random `originId`, which the
 * alert carries, so it can skip its own alert.
 */
export const POST = withBasicRoute(async ({ req }) => {
  const blocked = blockedResponse(req);
  if (blocked) return blocked;

  const parsed = verifySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 },
    );
  }

  if (!(await verifyAdminKey(parsed.data.key))) {
    await signInFailed(req, SETTINGS, parsed.data.seats);
    return NextResponse.json(
      { success: false, error: "Incorrect admin key" },
      { status: 401 },
    );
  }

  const adminToken = crypto.randomUUID();
  await createLoginSession({
    token: adminToken,
    gameId: null,
    role: "ADMIN",
  });
  await signInSucceeded(
    req,
    SETTINGS,
    "adminKey",
    parsed.data.seats,
    parsed.data.originId,
  );
  return success({ adminToken });
});
