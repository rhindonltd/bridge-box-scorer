import { NextResponse } from "next/server";
import { z } from "zod";
import { withBasicRoute } from "@/lib/api/basicRoute";
import { withAdminRoute } from "@/lib/api/adminRoute";
import { success } from "@/lib/api/success";
import { getEbuStatus } from "@/db/system/queries/ebu-credentials";
import {
  saveEbuCredentials,
  saveEbuNumber,
} from "@/db/system/actions/save-ebu-credentials";

// Reading the EBU status is public (the manage page uses it to decide whether
// to show the upload button). The status never carries the password. Writing
// the credentials is a device setting and requires the admin token, consistent
// with club / wifi / bridgewebs.
export const GET = withBasicRoute(async () => {
  return success(await getEbuStatus());
});

const bodySchema = z.object({
  ebuNumber: z.string().trim().min(1),
  // Blank password means "keep the existing password" — the form renders the
  // password field empty even when configured, so a save without re-typing it
  // should not wipe the stored secret.
  password: z.string(),
});

export const POST = withAdminRoute(async ({ req }) => {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 },
    );
  }

  const { ebuNumber, password } = parsed.data;

  if (password.length > 0) {
    await saveEbuCredentials(ebuNumber, password);
  } else {
    // Keep any stored password; only update the EBU number.
    await saveEbuNumber(ebuNumber);
  }

  return success({});
});
