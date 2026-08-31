import fs from "fs";
import { exec } from "child_process";
import { withBasicRoute } from "@/lib/api/basicRoute";
import { success } from "@/lib/api/success"

const WIFI_CONFIG = "/home/bridgebox/bridge-box/wifi.json";

export const POST = withBasicRoute(async () => {
  if (fs.existsSync(WIFI_CONFIG)) {
    fs.unlinkSync(WIFI_CONFIG);
  }

  exec("sudo systemctl restart bridge-box");

  return success({ message: "WiFi reset. Device restarting..." });
});
