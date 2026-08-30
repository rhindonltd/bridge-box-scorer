import fs from "fs";
import { NextResponse } from "next/server";
import { z } from "zod";

const WIFI_CONFIG = "/home/bridgebox/bridge-box/wifi.json";

export async function POST(req: Request) {
  try {
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

    return Response.json({
      success: true,
      message: "WiFi saved. Restart required.",
    });
  } catch {
    return Response.json({ error: "Failed to save WiFi" }, { status: 500 });
  }
}
