import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { withBasicRoute } from "@/lib/api/basicRoute";
import { success } from "@/lib/api/success";
import { verifyAdminKey } from "@/db/system/queries/admin-key";
import { createLoginSession } from "@/db/system/actions/create-login-session";

const verifySchema = z.object({
  key: z.string().min(1),
});

/**
 * POST /api/system/admin-key/verify
 *
 * The one place the admin key is sent to the server. On a correct key we mint
 * a short-lived ADMIN login session and return its token; the client uses that
 * token (not the key) for subsequent admin/device calls.
 */
export const POST = withBasicRoute(async ({ req }) => {
  const parsed = verifySchema.safeParse(await req.json());

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 },
    );
  }

  if (!(await verifyAdminKey(parsed.data.key))) {
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

  return success({ adminToken });
});
