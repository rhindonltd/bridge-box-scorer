import { NextResponse } from "next/server";
import { z } from "zod";
import { withBasicRoute } from "@/lib/api/basicRoute";
import { withAdminRoute } from "@/lib/api/adminRoute";
import { success } from "@/lib/api/success";
import { getBridgewebsStatus } from "@/db/system/queries/bridgewebs-credentials";
import {
  saveBridgewebsCredentials,
  saveBridgewebsClub,
} from "@/db/system/actions/save-bridgewebs-credentials";

// Reading the BridgeWebs status is public (the create page uses it to decide
// whether to show the event picker, and the manage page to show the upload
// button). The status never carries the password. Writing the credentials is a
// device setting and requires the admin token, consistent with club/wifi.
export const GET = withBasicRoute(async () => {
  return success(await getBridgewebsStatus());
});

const bodySchema = z.object({
  club: z.string().trim().min(1),
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

  const { club, password } = parsed.data;

  if (password.length > 0) {
    await saveBridgewebsCredentials(club, password);
  } else {
    // Keep any stored password; only update the club code.
    await saveBridgewebsClub(club);
  }

  return success({});
});
