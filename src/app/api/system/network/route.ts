import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import { withBasicRoute } from "@/lib/api/basicRoute";
import { NextResponse } from "next/server";
import { success } from "@/lib/api/success";

const execAsync = promisify(exec);

const WIFI_CONFIG = "/home/bridgebox/bridge-box/wifi.json";

export const GET = withBasicRoute(async () => {
  const { stdout } = await execAsync(
    "nmcli -t -f ACTIVE,SSID dev wifi | egrep '^yes'",
  );

  const currentSSID = stdout.split(":")[1] || null;

  let savedConfig = null;
  if (fs.existsSync(WIFI_CONFIG)) {
    savedConfig = JSON.parse(fs.readFileSync(WIFI_CONFIG, "utf-8"));
  }

  return success({
    wifi: {
      connected: !!currentSSID,
      currentSSID,
      savedSSID: savedConfig?.ssid ?? null,
    },
  });
});
