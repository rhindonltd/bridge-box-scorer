import fs from "fs";
import { exec } from "child_process";
import { withAdminRoute } from "@/lib/api/adminRoute";
import { success } from "@/lib/api/success";
import { WIFI_CONFIG_PATH } from "@/lib/system/wifi-config";

export const POST = withAdminRoute(async () => {
  if (fs.existsSync(WIFI_CONFIG_PATH)) {
    fs.unlinkSync(WIFI_CONFIG_PATH);
  }

  exec("sudo systemctl restart bridge-box");

  return success({ message: "WiFi reset. Device restarting..." });
});
