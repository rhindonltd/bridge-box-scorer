import { withAdminRoute } from "@/lib/api/adminRoute";
import { exec } from "child_process";
import { success } from "@/lib/api/success";

export const POST = withAdminRoute(async ({ log }) => {
  log.warn("Reboot requested via admin API");
  // Fire-and-forget: the reboot tears the process down, so the HTTP response
  // usually never reaches the caller. Log a failure so a broken/denied helper
  // is diagnosable rather than silently swallowed.
  exec("sudo /usr/local/bridgebox/bin/reboot.sh", (err) => {
    if (err) log.error({ err }, "Reboot command failed");
  });

  return success({ message: "Rebooting device..." });
});
