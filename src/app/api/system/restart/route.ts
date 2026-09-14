import { withAdminRoute } from "@/lib/api/adminRoute";
import { exec } from "child_process";
import { success } from "@/lib/api/success";

export const POST = withAdminRoute(async ({ log }) => {
  log.warn("Service restart requested via admin API");
  exec("sudo /usr/local/bridgebox/bin/restart-service.sh", (err) => {
    if (err) log.error({ err }, "Restart command failed");
  });

  return success({ message: "Restarting system..." });
});
