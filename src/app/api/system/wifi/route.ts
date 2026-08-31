import { withBasicRoute } from "@/lib/api/basicRoute";
import fs from "fs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { success } from "@/lib/api/success"

const WIFI_CONFIG = "/home/bridgebox/bridge-box/wifi.json";

export const POST = withBasicRoute(async ({ req }) => {
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
