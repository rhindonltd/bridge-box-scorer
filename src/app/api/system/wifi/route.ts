import { withAdminRoute } from "@/lib/api/adminRoute";
import { NextResponse } from "next/server";
import { z } from "zod";
import { success } from "@/lib/api/success";
import { isWifiManagementAvailable } from "@/lib/system/wifi-availability";
import { writeWifiConfig } from "@/lib/system/wifi-config";

export const POST = withAdminRoute(async ({ req }) => {
  // No WiFi management on this device: refuse the save with a clear reason.
  if (!(await isWifiManagementAvailable())) {
    return NextResponse.json(
      {
        success: false,
        error: "WiFi management not available on this device",
      },
      { status: 200 },
    );
  }

  // Malformed JSON is a client error (400), not a 500: `.catch(() => null)`
  // yields null, which fails the schema below.
  const body = await req.json().catch(() => null);

  const schema = z.object({
    ssid: z.string(),
    password: z.string(),
  });

  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid request",
      },
      { status: 400 },
    );
  }

  // Atomic write: a systemd watcher on the box reacts to this file and connects
  // to the new network, so it must never observe a partial write. See
  // `writeWifiConfig`.
  writeWifiConfig(parsed.data);

  return success({ message: "WiFi saved." });
});
