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
import { upsertClub } from "@/db/system/actions/upsert-club";

// Reading the EBU status is public (the manage page uses it to decide whether
// to show the upload button). The status never carries the password. Writing
// the credentials is a device setting and requires the admin token, consistent
// with club / wifi / bridgewebs.
export const GET = withBasicRoute(async () => {
  return success(await getEbuStatus());
});

const bodySchema = z.object({
  ebuNumber: z.string().trim().min(1),
  // Blank password means "keep the existing password" (or, when none is stored
  // yet, "no EBU login") — the form renders the password field empty even when
  // configured, so a save without re-typing it should not wipe the stored
  // secret. A password is only needed to submit results to the EBU; the club
  // name + number alone are enough for the results files.
  password: z.string(),
  // The club's name. When sent, the club record (name + EBU club number) used
  // by the USEBIO / PBN exports and the BridgeWebs upload is saved too, so one
  // screen sets the club's identity everywhere. Optional so callers that only
  // manage the EBU login keep working.
  clubName: z.string().trim().min(1).optional(),
});

export const POST = withAdminRoute(async ({ req }) => {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 },
    );
  }

  const { ebuNumber, password, clubName } = parsed.data;

  // The EBU club number is the same number the results files carry, so keep
  // the club record in step with it.
  if (clubName !== undefined) {
    await upsertClub(clubName, ebuNumber);
  }

  if (password.length > 0) {
    await saveEbuCredentials(ebuNumber, password);
  } else {
    // Keep any stored password; only update the EBU number.
    await saveEbuNumber(ebuNumber);
  }

  return success({});
});
