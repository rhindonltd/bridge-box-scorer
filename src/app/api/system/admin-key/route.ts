import { NextResponse } from "next/server";
import { z } from "zod";
import { withAdminRoute } from "@/lib/api/adminRoute";
import { success } from "@/lib/api/success";
import { setAdminKey } from "@/db/system/queries/admin-key";

const updateSchema = z.object({
  key: z.string().min(4),
});

/**
 * POST /api/system/admin-key
 *
 * Updates the admin key. Requires a valid admin session token (x-admin-token).
 */
export const POST = withAdminRoute(async ({ req }) => {
  const parsed = updateSchema.safeParse(await req.json());

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Admin key must be at least 4 characters" },
      { status: 400 },
    );
  }

  await setAdminKey(parsed.data.key);

  return success({ message: "Admin key updated." });
});
