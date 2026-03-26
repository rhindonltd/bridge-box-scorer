import fs from "fs";
import { exec } from "child_process";

const WIFI_CONFIG = "/home/bridgebox/bridge-box/wifi.json";

export async function POST() {
  try {
    if (fs.existsSync(WIFI_CONFIG)) {
      fs.unlinkSync(WIFI_CONFIG);
    }

    exec("sudo systemctl restart bridge-box");

    return Response.json({
      success: true,
      message: "WiFi reset. Device restarting...",
    });
  } catch (err) {
    return Response.json({ error: "Failed to reset WiFi" }, { status: 500 });
  }
}
