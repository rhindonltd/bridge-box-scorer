import { withAdminRoute } from "@/lib/api/adminRoute";
import fs from "fs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { success } from "@/lib/api/success";
import { isWifiManagementAvailable } from "@/lib/system/wifi-availability";

const WIFI_CONFIG = "/home/bridgebox/bridge-box/wifi.json";

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

  const body = await req.json();

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

  fs.writeFileSync(WIFI_CONFIG, JSON.stringify(parsed.data, null, 2));

  return success({ message: "WiFi saved. Restart required." });
});
